<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Notifications\OrderPlacedNotification;
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

        $order->load(['seller', 'buyer', 'items.product', 'video:id,thumbnail_url']);
        return Inertia::render('Order/Show', ['order' => $order]);
    }

 public function success(Request $request): Response|\Illuminate\Http\RedirectResponse
{
    $reference = $request->query('reference') ?? $request->query('trxref');
 
    if (!$reference) {
        return redirect()->route('orders.index');
    }
 
    // Don't restrict by buyer_id here — Paystack redirect may arrive
    // before session is fully restored on some browsers/devices.
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
 
    // Security: only buyer or seller can view this page
    $userId = Auth::id();
    if ($order->buyer_id !== $userId && $order->seller_id !== $userId) {
        return redirect()->route('orders.index');
    }
 
    return Inertia::render('Order/Success', [
        'order' => array_merge($order->toArray(), [
            'formatted_total' => '₦' . number_format($order->total, 2),
            'courier_name'    => $order->courier_name ?? $order->courier ?? null,
            'tracking_number' => $order->tracking_number ?? null,
            'courier_fee'     => (float) ($order->courier_fee ?? 0),
        ]),
    ]);
}

    // ── API ───────────────────────────────────────────────────────────────────

    /**
     * POST /api/orders/checkout
     *
     * Auto-applies a valid coupon if buyer has one and cart qualifies.
     * Coupon discount split: 50% off seller payout, 50% off platform fee.
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id'           => 'required|integer|exists:products,id',
            'quantity'             => 'required|integer|min:1|max:100',
            'shipping_address'     => 'nullable|array',
            'video_id'             => 'nullable|integer|exists:videos,id',
            'address_id'           => 'nullable|integer|exists:user_addresses,id',
            'rate_id'              => 'nullable|string',
            'carrier'              => 'nullable|string|max:100',
            'courier_fee'          => 'nullable|numeric|min:0',
            'delivery_platform_fee'=> 'nullable|numeric|min:0',
            'coupon_code'          => 'nullable|string',
        ]);

$product = Product::active()->inStock()->findOrFail($validated['product_id']);
$qty     = $validated['quantity'];

if ($product->stock_quantity < $qty) {
    return response()->json(['message' => 'Not enough stock available.'], 422);
}

$subtotal            = $product->price * $qty;

$unitPrice = (float) ($sku?->price ?? $product->price);
$subtotal  = $unitPrice * $qty;
        $shipping            = $product->shipping_fee;
        $courierFee          = (float) ($validated['courier_fee'] ?? 0);
        $deliveryPlatformFee = (float) ($validated['delivery_platform_fee'] ?? 0);
        $platformFee         = round($subtotal * config('flockr.platform_fee_percent', 5) / 100, 2);
        $total               = $subtotal + $courierFee + $deliveryPlatformFee;

        // ── Coupon auto-apply ─────────────────────────────────────────────────
        // Find the buyer's best valid unused coupon that fits this order total
        $coupon         = null;
        $couponDiscount = 0;

        $applicableCoupon = Coupon::where('buyer_id', Auth::id())
            ->whereNull('used_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->where('min_order', '<=', $total)
            ->orderByDesc('amount') // apply biggest coupon if multiple
            ->first();

        if ($applicableCoupon) {
            $coupon         = $applicableCoupon;
            $couponDiscount = min((float) $coupon->amount, $total); // never discount more than total

            // Split the discount 50/50 between seller and Flockr
            $sellerShare   = round($couponDiscount / 2, 2);
            $flockrShare   = $couponDiscount - $sellerShare; // remainder to avoid rounding gap

            $platformFee   = max(0, $platformFee - $flockrShare);
            $total         = max(0, $total - $couponDiscount);
        }

        $order = DB::transaction(function () use (
            $product, $qty, $subtotal, $shipping, $platformFee,
            $total, $request, $coupon, $couponDiscount, $validated
        ) {
            $order = Order::create([
                'buyer_id'         => Auth::id(),
                'seller_id'        => $product->seller_id,
                'video_id'         => $validated['video_id'] ?? null,
                'subtotal'         => $subtotal,
                'shipping_fee'     => $shipping,
                'platform_fee'     => $platformFee,
                'total'            => $total,
                'shipping_address' => $validated['shipping_address'] ?? null,
            ]);
OrderItem::create([
    'order_id'     => $order->id,
    'product_id'   => $product->id,
    'product_name' => $product->name,
    'unit_price'   => $product->price,
    'quantity'     => $qty,
    'total'        => $subtotal,
]);

            // Reserve the coupon immediately so it can't be used on another order
            // We'll mark used_at when payment is confirmed (in markAsPaid)
            if ($coupon) {
                $coupon->update(['used_on_order_id' => $order->id]);
            }

            return $order;
        });

        try {
            $payment = $this->paystack->initializeTransaction($order->load(['buyer', 'seller']));
        } catch (\Throwable $e) {
            $order->forceDelete();
            // Release the coupon reservation if payment init failed
            if ($coupon) {
                $coupon->update(['used_on_order_id' => null]);
            }
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
     * GET /orders/callback  — Paystack redirects here after payment
     */
    public function paystackCallback(Request $request): \Illuminate\Http\RedirectResponse
    {
        $reference = $request->query('reference') ?? $request->query('trxref');
        if (!$reference)
            return redirect()->route('home')->with('error', 'Invalid payment reference.');

        try {
            $data  = $this->paystack->verifyTransaction($reference);
            $order = Order::where('reference', $reference)->firstOrFail();

            if ($data['status'] === 'success' && $order->status === 'pending') {
                $order->markAsPaid($reference, $data['id']);
                $order->buyer->notify(new OrderPlacedNotification($order));
            }

            return redirect()->route('orders.success', ['reference' => $reference]);
        } catch (\Throwable $e) {
            Log::error('Paystack callback failed', ['ref' => $reference, 'error' => $e->getMessage()]);
            return redirect()->route('orders.index')->with('error', 'Payment verification failed. Contact support if charged.');
        }
    }

    /**
     * POST /api/webhooks/paystack  — server-to-server webhook
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
            $order = Order::where('reference', $data['reference'])->first();
            if ($order && $order->status === 'pending') {
                $order->markAsPaid($data['reference'], $data['id']);
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
    public function cancel(Order $order, Request $request): JsonResponse
    {
        abort_unless($order->buyer_id === Auth::id(), 403);

        if (!$order->canBeCancelled()) {
            return response()->json(['message' => 'This order cannot be cancelled.'], 422);
        }

        $order->update([
            'status'              => 'cancelled',
            'cancellation_reason' => $request->input('reason', 'Cancelled by buyer'),
        ]);

        // Release any reserved coupon so buyer can use it on another order
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
     *
     * Sets delivered_at automatically when status → delivered.
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        if (Auth::id() !== $order->seller_id) {
            return response()->json(['message' => 'You cannot purchase your own product.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:processing,shipped,delivered,cancelled',
        ]);

        $updates = ['status' => $validated['status']];

        // Auto-set delivered_at when seller marks as delivered
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
        // Terminal reschedule endpoint
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
 
        // Reset status to processing so we're waiting for pickup again
        $order->update(['status' => 'processing']);
 
        // Notify buyer
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

}