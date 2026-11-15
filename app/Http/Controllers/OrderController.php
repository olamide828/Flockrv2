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

        $order->load(['video:id,thumbnail_url']);
        return Inertia::render('Order/Show', ['order' => app(\App\Services\OrderTrackingService::class)->present($order)]);
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

        return Inertia::render('Order/Success', ['order' => app(\App\Services\OrderTrackingService::class)->present($order)]);
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
        return response()->json(['message' => 'You cannot purchase your own product.'], 422);
    }

    $qty = $validated['quantity'];

    $stockSvc = app(\App\Services\StockReservationService::class);
    if ($stockSvc->available($product->id) < $qty) {
        return response()->json(['message' => 'Not enough stock available right now — another buyer may be checking out with the last units.'], 422);
    }

    // Apply an active event discount if this seller has joined one — computed
    // server-side from the product's own accessor, never trusted from the client.
    $activeEvent = $product->active_event;
    $unitPrice   = $product->event_price ?? $product->price;
    $subtotal    = $unitPrice * $qty;
    $eventDiscountAmount = $activeEvent ? ($product->price - $unitPrice) * $qty : null;

    $courierFee          = (float) ($validated['courier_fee'] ?? $product->shipping_fee ?? 0);
    $deliveryPlatformFee = (float) ($validated['delivery_platform_fee'] ?? 0);
    $feePercent = $activeEvent?->event_fee_percent
        ?? ($product->seller->hasActiveSubscription()
            ? config('flockr.pro_platform_fee_percent', 3)
            : config('flockr.platform_fee_percent', 5));
    $platformFee = round($subtotal * $feePercent / 100, 2);
    $total       = $subtotal + $courierFee + $deliveryPlatformFee;

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
        $couponDiscount = round($couponDiscount, 2);
        $sellerShare    = round($couponDiscount / 2, 2);
        $flockrShare    = $couponDiscount - $sellerShare;
        $platformFee    = max(0, $platformFee - $flockrShare);
        $total          = max(0, $total - $couponDiscount);
    }

    $sellerEarning = max(0, round($subtotal - $couponDiscount - $platformFee, 2));

    try {
    $order = DB::transaction(function () use (
        $product, $qty, $subtotal, $platformFee, $unitPrice,
        $activeEvent, $eventDiscountAmount,
        $total, $coupon, $validated, $sellerEarning, $couponDiscount, $deliveryPlatformFee
    ) {
        $order = Order::create([
            'buyer_id'              => Auth::id(),
            'seller_id'             => $product->seller_id,
            'video_id'              => $validated['video_id'] ?? null,
            'subtotal'              => $subtotal,
            'shipping_fee'          => (float) ($validated['courier_fee'] ?? $product->shipping_fee ?? 0),
            'courier_fee'           => (float) ($validated['courier_fee'] ?? 0),
            'courier_name'          => $validated['carrier'] ?? null,
            'terminal_rate_id'      => $validated['rate_id'] ?? null,
            'delivery_address_id'   => $validated['address_id'] ?? null,
            'platform_fee'          => $platformFee,
            'seller_earning'        => $sellerEarning,
            'flockr_fee'            => $deliveryPlatformFee,
            'discount_amount'       => $couponDiscount,
            'total'                 => $total,
            'payment_total'         => $total,
            'event_id'              => $activeEvent?->id,
            'event_discount_amount' => $eventDiscountAmount,
            'shipping_address'      => $validated['address_id']
                ? \App\Models\UserAddress::find($validated['address_id'])?->toTerminalFormat()
                : ($validated['shipping_address'] ?? null),
            'estimated_delivery'    => $validated['delivery_date'] ?? null,
        ]);

        OrderItem::create([
            'order_id'     => $order->id,
            'product_id'   => $product->id,
            'product_name' => $product->name,
            'unit_price'   => $unitPrice,
            'quantity'     => $qty,
            'total'        => $subtotal,
        ]);

        if ($coupon) {
            $coupon->update(['used_on_order_id' => $order->id]);
        }

        // Hold the stock for 30 minutes (locks the product row; throws if someone else got the last unit)
        app(\App\Services\StockReservationService::class)->reserve($order, $product->id, $qty);

        return $order;
    });
    } catch (\App\Exceptions\OutOfStockException $e) {
        return response()->json(['message' => $e->getMessage()], 422);
    }

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

    return Inertia::render('Order/Tracking', ['order' => app(\App\Services\OrderTrackingService::class)->present($order)]);
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
            'timeline'        => app(\App\Services\OrderTrackingService::class)->timeline($order),
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

    return response()->json(['events' => app(\App\Services\OrderTrackingService::class)->timeline($order)]);
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

            if (($data['status'] ?? null) === 'success') {
                $this->settlePaidBatch($order, $reference, $data);
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
            $primaryOrder = Order::where('reference', $data['reference'] ?? '')->first();

            if ($primaryOrder) {
                $this->settlePaidBatch($primaryOrder, $data['reference'], $data);
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
                app(\App\Services\WalletService::class)->post(
                    userId: $payout->seller_id,
                    type: 'credit',
                    amount: (float) $payout->amount,
                    source: 'payout_reversal',
                    description: 'Payout failed — funds returned to wallet',
                );
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

    // Once a courier has been booked the parcel may already be collected.
    if ($order->terminal_shipment_id && in_array($order->status, ['processing', 'shipped'])) {
        return response()->json(['message' => 'This order is already with a courier. Please open a dispute instead.'], 422);
    }

    $result = $this->cancelAndRefund($order, $request->input('reason', 'Cancelled by buyer'));

    return response()->json(['message' => $result['paid']
        ? ($result['refund_ok'] ? 'Order cancelled and your refund is on its way.' : 'Order cancelled. Your refund is being processed by our team.')
        : 'Order cancelled.']);
}

/**
 * Shared by buyer cancel, seller cancel and admin cancel: cancel, return coupon,
 * take back seller money (only if it had been released), refund the buyer on Paystack.
 *
 * @return array{paid:bool,refund_ok:bool}
 */
public function cancelAndRefund(Order $order, string $reason): array
{
    $wasPaid = (bool) $order->paid_at;

    DB::transaction(function () use ($order, $reason) {
        $order->update(['status' => 'cancelled', 'cancellation_reason' => $reason]);
        $order->reverseSellerCredit("Order {$order->reference} cancelled");

        // Put the stock back for orders that had already been paid for.
        if ($order->paid_at) {
            foreach ($order->items as $item) {
                \App\Models\Product::where('id', $item->product_id)
                    ->update(['stock_quantity' => DB::raw('stock_quantity + ' . (int) $item->quantity)]);
            }
        }
    });

    Coupon::where('used_on_order_id', $order->id)
        ->whereNull('used_at')
        ->update(['used_on_order_id' => null]);

    $refundOk = true;
    if ($wasPaid) {
        $refundOk = app(\App\Services\RefundService::class)->refund($order->fresh())['ok'];
    }

    return ['paid' => $wasPaid, 'refund_ok' => $refundOk];
}

/**
 * Mark an order (and its checkout-batch siblings) paid, but only if the amount
 * Paystack actually collected matches what we expected to charge.
 */
private function settlePaidBatch(Order $order, string $reference, array $data): void
{
    if ($order->status !== 'pending') {
        return; // already handled by the other path (callback vs webhook)
    }

    $expected = (int) round(((float) ($order->payment_total ?: $order->total)) * 100);
    $paid     = (int) ($data['amount'] ?? 0);
    $currency = strtoupper($data['currency'] ?? 'NGN');

    if ($paid < $expected || $currency !== 'NGN') {
        Log::critical('Paystack amount mismatch — order NOT marked paid', [
            'order' => $order->reference, 'expected_kobo' => $expected, 'paid_kobo' => $paid, 'currency' => $currency,
        ]);
        return;
    }

    $order->markAsPaid($reference, (string) $data['id']);

    try { $order->buyer->notify(new NewOrderNotification($order)); } catch (\Throwable) {}
    $this->awardPurchaseBadges($order->buyer_id);

    if ($order->checkout_batch_id) {
        Order::where('checkout_batch_id', $order->checkout_batch_id)
            ->where('id', '!=', $order->id)
            ->where('status', 'pending')
            ->get()
            ->each(function (Order $sibling) use ($reference, $data) {
                $sibling->markAsPaid($reference, (string) $data['id']);
                try { $sibling->buyer->notify(new NewOrderNotification($sibling)); } catch (\Throwable) {}
            });
    }
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
        'status' => 'required|in:processing,shipped,cancelled',
    ]);

    // 'delivered' starts the escrow clock, so only the courier webhook (or an admin) may set it.
    if ($validated['status'] === 'cancelled') {
        if (!in_array($order->status, ['paid', 'confirmed', 'processing'])) {
            return response()->json(['message' => 'This order can no longer be cancelled.'], 422);
        }
        $this->cancelAndRefund($order, 'Cancelled by seller');
        return response()->json(['status' => 'cancelled']);
    }


    if ($validated['status'] === 'processing' && !$order->terminal_shipment_id) {
        try {
            $terminal = app(\App\Services\TerminalService::class);
            $seller   = $order->seller;
            $address  = \App\Models\UserAddress::find($order->delivery_address_id);

            if (!$order->terminal_rate_id || !$seller->pickup_street || !$address) {
                return response()->json([
                    'message' => 'Missing shipping details for this order — cannot book courier yet.',
                ], 422);
            }

            $shipment = $terminal->createShipment(
                order:    $order,
                rateId:   $order->terminal_rate_id,
                pickup:   [
                    'name'        => $seller->name,
                    'phone'       => $seller->phone,
                    'email'       => $seller->email,
                    'address'     => $seller->pickup_street,
                    'city'        => $seller->pickup_city,
                    'state'       => $seller->pickup_state,
                    'country'     => 'NG',
                    'postal_code' => $seller->pickup_postal_code ?? '000000',
                ],
                delivery: array_merge($address->toTerminalFormat(), ['email' => $order->buyer->email]),
                parcel:   [
                    'weight'      => 0.5,
                    'items_count' => $order->items()->count(),
                    'description' => 'Flockr order ' . $order->reference,
                ],
            );

            $order->update([
                'terminal_shipment_id' => $shipment['shipment_id'],
                'tracking_number'      => $shipment['tracking_number'],
                'courier'              => $shipment['carrier'],
            ]);
        } catch (\Throwable $e) {
            Log::error('Courier booking failed on mark-ready', ['order' => $order->reference, 'error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Could not book a courier for this order right now. Please try again.',
            ], 503);
        }
    }

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

        try {
            app(\App\Services\StockReservationService::class)->ensureForOrder($order->load('items'));
        } catch (\App\Exceptions\OutOfStockException $e) {
            return response()->json(['message' => $e->getMessage() . ' Your order can no longer be completed.'], 422);
        }

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