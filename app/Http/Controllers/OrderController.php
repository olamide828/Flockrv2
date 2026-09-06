<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Notifications\NewOrderNotification;
use App\Services\PaystackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function __construct(private readonly PaystackService $paystack)
    {
    }

    // ── Inertia pages ─────────────────────────────────────────────────────────

    public function index(): Response
    {
        $orders = Auth::user()
            ->orders()
            ->with([
                'seller:id,name,username,avatar',
                'items.product:id,name,images,price,compare_price,stock_quantity,slug',
            ])
            ->latest()
            ->paginate(20);

        return Inertia::render('Order/Index', ['orders' => $orders->items()]);
    }

    public function show(Order $order): Response
    {
        $userId = Auth::id();
        abort_unless($order->buyer_id === $userId || $order->seller_id === $userId, 403);

        $order->load(['seller', 'buyer', 'items.product', 'video:id,thumbnail_url', 'dispute.messages.user:id,name,username,avatar']);
        return Inertia::render('Order/Show', ['order' => $order]);
    }

    public function success(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $reference = $request->query('reference') ?? $request->query('trxref');

         Log::info('Success page hit', [
        'reference' => $reference,
        'auth_id'   => Auth::id(),
        'order'     => Order::where('reference', $reference)->value('buyer_id'),
    ]);

        if (!$reference) {
            return redirect()->route('orders.index');
        }

        $order = Order::where('reference', $reference)
            ->with([
                'items.product:id,name,images,slug',
                'seller:id,name,username,avatar',
                'buyer:id,name,email',
            ])
            ->first();

        if (!$order) {
            return redirect()->route('orders.index');
        }

        $userId = Auth::id();
        if ($order->buyer_id !== $userId && $order->seller_id !== $userId) {
            return redirect()->route('orders.index');
        }

        return Inertia::render('Order/Success', [
    'order' => array_merge($order->toArray(), [
        'formatted_total' => '₦' . number_format($order->total, 2),
        'courier_name'    => $order->courier_name ?? $order->courier ?? null,
        'tracking_number' => $order->tracking_number ?? null,
        'courier_fee'     => (float) ($order->courier_fee > 0
                                ? $order->courier_fee
                                : $order->shipping_fee), 
    ]),
]);
    }

    // ── API ───────────────────────────────────────────────────────────────────

    /**
     * POST /api/orders/checkout
     * Single-product checkout (Buy Now button on product page).
     * Cart checkout is handled by CartController::checkout().
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id'            => 'required|integer|exists:products,id',
            'quantity'              => 'required|integer|min:1|max:100',
            'shipping_address'      => 'nullable|array',
            'video_id'              => 'nullable|integer|exists:videos,id',
            'address_id'            => 'nullable|integer|exists:user_addresses,id',
            'rate_id'               => 'nullable|string',
            'carrier'               => 'nullable|string|max:100',
            'courier_fee'           => 'nullable|numeric|min:0',
            'delivery_platform_fee' => 'nullable|numeric|min:0',
            'coupon_code'           => 'nullable|string',
        ]);

        $product = Product::active()->inStock()->findOrFail($validated['product_id']);

        if ($product->seller_id === Auth::id()) {
    return response()->json([
        'message' => 'You cannot purchase your own product.',
    ], 422);
}

        $qty     = $validated['quantity'];

        if ($product->stock_quantity < $qty) {
            return response()->json(['message' => 'Not enough stock available.'], 422);
        }

        // Clean subtotal — no SKU reference
        $subtotal            = $product->price * $qty;
        $courierFee          = (float) ($validated['courier_fee'] ?? $product->shipping_fee ?? 0);
        $deliveryPlatformFee = (float) ($validated['delivery_platform_fee'] ?? 0);
        $feePercent = $product->seller->hasActiveSubscription()
    ? config('flockr.pro_platform_fee_percent', 3)
    : config('flockr.platform_fee_percent', 5);
$platformFee = round($subtotal * $feePercent / 100, 2);
        $total               = $subtotal + $courierFee + $deliveryPlatformFee;

        // ── Coupon auto-apply ─────────────────────────────────────────────────
        $coupon         = null;
        $couponDiscount = 0;

        $applicableCoupon = Coupon::where('buyer_id', Auth::id())
            ->whereNull('used_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->where('min_order', '<=', $total)
            ->orderByDesc('amount')
            ->first();

        if ($applicableCoupon) {
            $coupon         = $applicableCoupon;
            $couponDiscount = min((float) $coupon->amount, $total);
            $sellerShare    = round($couponDiscount / 2, 2);
            $flockrShare    = $couponDiscount - $sellerShare;
            $platformFee    = max(0, $platformFee - $flockrShare);
            $total          = max(0, $total - $couponDiscount);
        }

        $order = DB::transaction(function () use (
            $product, $qty, $subtotal, $platformFee,
            $total, $coupon, $validated
        ) {
            $order = Order::create([
    'buyer_id'            => Auth::id(),
    'seller_id'           => $product->seller_id,
    'video_id'            => $validated['video_id'] ?? null,
    'subtotal'            => $subtotal,
    'shipping_fee'        => (float) ($validated['courier_fee'] ?? $product->shipping_fee ?? 0),
    'courier_fee'         => (float) ($validated['courier_fee'] ?? 0),
    'courier_name'        => $validated['carrier'] ?? null,
    'terminal_rate_id'    => $validated['rate_id'] ?? null,
    'delivery_address_id' => $validated['address_id'] ?? null,
    'platform_fee'        => $platformFee,
    'total'               => $total,
    'shipping_address'    => $validated['address_id']
        ? \App\Models\UserAddress::find($validated['address_id'])?->toTerminalFormat()
        : ($validated['shipping_address'] ?? null),
    'estimated_delivery'  => $validated['delivery_date'] ?? null,
]);

            OrderItem::create([
                'order_id'     => $order->id,
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'unit_price'   => $product->price,
                'quantity'     => $qty,
                'total'        => $subtotal,
            ]);

            if ($coupon) {
                $coupon->update(['used_on_order_id' => $order->id]);
            }

            return $order;
        });

        try {
            $payment = $this->paystack->initializeTransaction($order->load(['buyer', 'seller']));
        } catch (\Throwable $e) {
            $order->forceDelete();
            if ($coupon) $coupon->update(['used_on_order_id' => null]);
            Log::error('Paystack initialization failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Payment initialization failed. Please check your connection and try again.',
            ], 503);
        }

        return response()->json([
            'order_id'          => $order->id,
            'reference'         => $order->reference,
            'authorization_url' => $payment['authorization_url'],
            'coupon_applied'    => $coupon ? [
                'code'     => $coupon->code,
                'discount' => $couponDiscount,
            ] : null,
        ]);
    }

    /**
 * GET /orders/{order}/tracking — Inertia page
 */
public function tracking(Order $order): Response|\Illuminate\Http\RedirectResponse
{
    $userId = Auth::id();
    if ($order->buyer_id !== $userId && $order->seller_id !== $userId) {
        return redirect()->route('orders.index');
    }

    $order->load([
        'items.product:id,name,images,slug',
        'seller:id,name,username,avatar',
        'buyer:id,name,email',
    ]);

    return Inertia::render('Order/Tracking', [
        'order' => array_merge($order->toArray(), [
            'courier_name'    => $order->courier_name ?? $order->courier ?? null,
            'tracking_number' => $order->tracking_number ?? null,
            'courier_fee'     => (float) ($order->courier_fee > 0
                                    ? $order->courier_fee
                                    : $order->shipping_fee),
        ]),
    ]);
}

/**
 * GET /api/orders/{order}/status — polling endpoint
 */
public function getStatus(Order $order): JsonResponse
{
    $userId = Auth::id();
    if ($order->buyer_id !== $userId && $order->seller_id !== $userId) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }

    return response()->json([
        'order' => [
            'status'          => $order->status,
            'paid_at'         => $order->paid_at,
            'shipped_at'      => $order->shipped_at,
            'delivered_at'    => $order->delivered_at,
            'tracking_number' => $order->tracking_number,
            'courier_name'    => $order->courier_name ?? $order->courier,
        ],
    ]);
}

/**
 * GET /api/orders/{order}/tracking — Terminal events
 */
public function getTrackingEvents(Order $order): JsonResponse
{
    $userId = Auth::id();
    if ($order->buyer_id !== $userId && $order->seller_id !== $userId) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }

    if (!$order->terminal_shipment_id) {
        return response()->json(['events' => []]);
    }

    try {
        $terminal = app(\App\Services\TerminalService::class);
        $events   = $terminal->trackShipment($order->terminal_shipment_id);
        return response()->json(['events' => $events]);
    } catch (\Throwable $e) {
        return response()->json(['events' => []]);
    }
}

    /**
     * GET /orders/callback — Paystack redirects here after payment.
     * Handles both single-product orders AND multi-seller cart orders.
     */
        public function paystackCallback(Request $request): \Illuminate\Http\RedirectResponse
    {
        $reference = $request->query('reference') ?? $request->query('trxref');
        if (!$reference) {
            return redirect()->route('home')->with('error', 'Invalid payment reference.');
        }

        try {
            $data  = $this->paystack->verifyTransaction($reference);
            $order = Order::where('reference', $reference)->firstOrFail();

            if ($data['status'] === 'success' && $order->status === 'pending') {
                $order->markAsPaid($reference, $data['id']);

                try {
                    $order->buyer->notify(new NewOrderNotification($order));
                } catch (\Throwable $e) {
                    Log::warning('Buyer notification failed in paystackCallback', ['error' => $e->getMessage()]);
                }

                $this->awardPurchaseBadges($order->buyer_id);

                if ($order->checkout_batch_id) {
                    $siblingOrders = Order::where('checkout_batch_id', $order->checkout_batch_id)
                        ->where('id', '!=', $order->id)
                        ->where('status', 'pending')
                        ->get();

                    foreach ($siblingOrders as $sibling) {
                        $sibling->markAsPaid($reference, $data['id']);
                        try {
                            $sibling->buyer->notify(new NewOrderNotification($sibling));
                        } catch (\Throwable) {}
                    }
                }
            }

            return redirect()->route('orders.success', ['reference' => $reference]);
        } catch (\Throwable $e) {
            Log::error('Paystack callback failed', ['ref' => $reference, 'error' => $e->getMessage()]);
            return redirect()->route('orders.index')->with('error', 'Payment verification failed. Contact support if charged.');
        }
    }

    /**
     * POST /api/webhooks/paystack — server-to-server webhook.
     * This is the reliable path — Paystack guarantees delivery even if the
     * browser redirect fails. Must also handle multi-seller cart orders.
     */
    public function paystackWebhook(Request $request): JsonResponse
    {
        $payload   = $request->getContent();
        $signature = $request->header('x-paystack-signature', '');

        if (!$this->paystack->verifyWebhook($payload, $signature)) {
            Log::warning('Paystack webhook: invalid signature');
            return response()->json(['ok' => false], 400);
        }

        $event = $request->json('event');
        $data  = $request->json('data');

        if ($event === 'charge.success') {
            $primaryOrder = Order::where('reference', $data['reference'])->first();

            if ($primaryOrder && $primaryOrder->status === 'pending') {
    $primaryOrder->markAsPaid($data['reference'], $data['id']);

    if ($primaryOrder->checkout_batch_id) {
        $siblingOrders = Order::where('checkout_batch_id', $primaryOrder->checkout_batch_id)
            ->where('id', '!=', $primaryOrder->id)
            ->where('status', 'pending')
            ->get();

        foreach ($siblingOrders as $sibling) {
            $sibling->markAsPaid($data['reference'], $data['id']);
            try {
                $sibling->buyer->notify(new NewOrderNotification($sibling));
                    } catch (\Throwable) {}
                }
            }
        }
    }

        if ($event === 'transfer.success') {
            \App\Models\Payout::where('reference', $data['reference'])
                ->where('status', 'pending')
                ->update(['status' => 'paid', 'paid_at' => now()]);
        }

        if ($event === 'transfer.failed') {
            $payout = \App\Models\Payout::where('reference', $data['reference'])->first();
            if ($payout && $payout->status !== 'failed') {
                $lastTx        = \App\Models\WalletTransaction::where('user_id', $payout->seller_id)->latest()->first();
                $balanceBefore = $lastTx?->balance_after ?? 0;
                \App\Models\WalletTransaction::create([
                    'user_id'       => $payout->seller_id,
                    'amount'        => $payout->amount,
                    'type'          => 'credit',
                    'source'        => 'payout_reversal',
                    'description'   => 'Payout failed — funds returned to wallet',
                    'balance_after' => $balanceBefore + $payout->amount,
                ]);
                $payout->update(['status' => 'failed', 'failure_reason' => $data['reason'] ?? 'Transfer failed']);
            }
        }

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/orders/{order}/cancel
     */
    // Replace the existing cancel() method with this:
public function cancel(Order $order, Request $request): JsonResponse
{
    abort_unless($order->buyer_id === Auth::id(), 403);

    if (!$order->canBeCancelled()) {
        return response()->json(['message' => 'This order cannot be cancelled.'], 422);
    }

    DB::transaction(function () use ($order, $request) {
        $order->update([
            'status'              => 'cancelled',
            'cancellation_reason' => $request->input('reason', 'Cancelled by buyer'),
        ]);

        // If the order had already been paid (canBeCancelled() allows
        // cancelling a 'paid' order, not just 'pending'), the seller's
        // wallet was already credited via markAsPaid(). Reverse that now —
        // previously this silently let the seller keep funds for an order
        // the buyer just cancelled.
        $order->reverseSellerCredit("Order {$order->reference} cancelled by buyer");
    });

    Coupon::where('used_on_order_id', $order->id)
        ->whereNull('used_at')
        ->update(['used_on_order_id' => null]);

    return response()->json(['message' => 'Order cancelled.']);
}
    public function apiShow(Order $order): JsonResponse
    {
        $userId = Auth::id();
        abort_unless($order->buyer_id === $userId || $order->seller_id === $userId, 403);
        return response()->json($order->load(['items.product', 'seller', 'buyer']));
    }

    /**
     * PATCH /api/orders/{order}/status
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        if (Auth::id() !== $order->seller_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:processing,shipped,delivered,cancelled',
        ]);

        $updates = ['status' => $validated['status']];

        if ($validated['status'] === 'delivered' && !$order->delivered_at) {
            $updates['delivered_at'] = now();
        }

        $order->update($updates);
        return response()->json(['status' => $order->status]);
    }

    /**
     * POST /api/orders/resume-payment
     */
    public function resumePayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|integer|exists:orders,id',
        ]);

        $order = Order::where('id', $validated['order_id'])
            ->where('buyer_id', Auth::id())
            ->where('status', 'pending')
            ->with(['buyer', 'seller'])
            ->firstOrFail();

        $newReference = 'FLK_' . Str::upper(Str::random(16));
        $order->update(['reference' => $newReference]);

        $payment = $this->paystack->initializeTransaction($order->fresh());

        return response()->json([
            'authorization_url' => $payment['authorization_url'],
            'reference'         => $newReference,
        ]);
    }

    public function confirmReceipt(Order $order): JsonResponse
{
    if ($order->buyer_id !== Auth::id()) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }

    if ($order->status !== 'delivered') {
        return response()->json(['message' => 'This order has not been marked delivered yet.'], 422);
    }

    $order->releaseEscrow('Buyer confirmed receipt early');

    return response()->json(['message' => 'Thanks! The seller has been paid.']);
}

    public function openDispute(Request $request, Order $order): JsonResponse
    {
        if ($order->buyer_id !== Auth::id()) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }

    $eligible = ['paid', 'confirmed', 'processing', 'shipped', 'delivered'];
    if (!in_array($order->status, $eligible)) {
        return response()->json([
            'message' => 'You can only dispute a paid or in-progress order.',
        ], 422);
    }

    if ($order->status === 'disputed') {
        return response()->json(['message' => 'A dispute is already open for this order.'], 422);
    }

    // ESCROW: give a generous buffer beyond the 3-day auto-release window
    // (so buyers who confirm late aren't locked out) but close disputes
    // eventually — past this point funds are considered final.
    if ($order->delivered_at && $order->delivered_at->diffInDays(now()) > 7) {
        return response()->json([
            'message' => 'The dispute window for this order has closed (7 days after delivery). Please contact support directly.',
        ], 422);
    }

        $validated = $request->validate([
            'reason'      => 'required|string|max:200',
            'description' => 'nullable|string|max:1000',
        ]);

        $fullReason = $validated['reason']
            . ($validated['description'] ? ': ' . $validated['description'] : '');

        $order->update([
            'status'              => 'disputed',
            'cancellation_reason' => $fullReason,
        ]);

        \App\Models\Report::create([
            'reporter_id' => Auth::id(),
            'reported_id' => $order->seller_id,
            'reason'      => "Order dispute ({$order->reference}): {$fullReason}",
            'status'      => 'pending',
        ]);

        try {
            $order->seller->notify(new \App\Notifications\NewOrderNotification($order));
        } catch (\Throwable) {}

        return response()->json([
            'message' => 'Dispute submitted. Our team will review within 24–48 hours.',
        ]);
    }

    public function reschedulePickup(Order $order): JsonResponse
    {
        if (Auth::id() !== $order->seller_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($order->status !== 'pickup_failed') {
            return response()->json(['message' => 'This order does not have a failed pickup.'], 422);
        }

        if (!$order->terminal_shipment_id) {
            return response()->json(['message' => 'No Terminal shipment found for this order.'], 422);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . config('services.terminal.secret_key'),
                'Content-Type'  => 'application/json',
            ])->timeout(20)->post(
                rtrim(config('services.terminal.base_url'), '/') . '/shipments/' . $order->terminal_shipment_id . '/reschedule',
                []
            );

            if ($response->failed()) {
                Log::warning('Terminal reschedule failed', [
                    'order'  => $order->reference,
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return response()->json([
                    'message' => 'Could not reschedule with Terminal. Please try again or contact support.',
                ], 422);
            }

            $order->update(['status' => 'processing']);

            $order->buyer->notify(new \App\Notifications\OrderStatusNotification(
                $order,
                'Pickup Rescheduled',
                "The seller has rescheduled courier pickup for order #{$order->reference}."
            ));

            return response()->json(['message' => 'Pickup rescheduled successfully.']);

        } catch (\Throwable $e) {
            Log::error('reschedulePickup failed', ['order' => $order->reference, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Something went wrong. Please try again.'], 503);
        }
    }

    private function awardPurchaseBadges(int $buyerId): void
{
    $orderCount = Order::where('buyer_id', $buyerId)->paid()->count();

    $badgeKey = match (true) {
        $orderCount === 1 => 'first_purchase',
        $orderCount === 5 => 'five_purchases',
        default => null,
    };

    if (!$badgeKey) return;

    $badge = \App\Models\Badge::where('key', $badgeKey)->first();
    if ($badge) {
        \App\Models\UserBadge::firstOrCreate(
            ['user_id' => $buyerId, 'badge_id' => $badge->id],
            ['awarded_at' => now()]
        );
    }
}
}