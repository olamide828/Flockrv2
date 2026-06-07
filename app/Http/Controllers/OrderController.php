<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Notifications\OrderPlacedNotification;
use App\Services\PaystackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

    public function success(Request $request): Response
    {
        $order = Order::where('reference', $request->query('reference'))
            ->where('buyer_id', Auth::id())
            ->with(['items.product', 'seller:id,name,username'])
            ->firstOrFail();

        return Inertia::render('Order/Success', ['order' => $order]);
    }

    // ── API ───────────────────────────────────────────────────────────────────

    /**
     * POST /api/orders/checkout
     * Create an order and return a Paystack authorization URL.
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1|max:100',
        ]);

        $product = Product::active()->inStock()->findOrFail($validated['product_id']);
        $qty = $validated['quantity'];

        if ($product->stock_quantity < $qty) {
            return response()->json(['message' => 'Not enough stock available.'], 422);
        }

        $subtotal = $product->price * $qty;
        $shipping = $product->shipping_fee;
        $platformFee = round($subtotal * config('flockr.platform_fee_percent', 5) / 100, 2);
        $total = $subtotal + $shipping;

        $order = DB::transaction(function () use ($product, $qty, $subtotal, $shipping, $platformFee, $total, $request) {
            $order = Order::create([
                'buyer_id' => Auth::id(),
                'seller_id' => $product->seller_id,
                'video_id' => $request->input('video_id'),
                'subtotal' => $subtotal,
                'shipping_fee' => $shipping,
                'platform_fee' => $platformFee,
                'total' => $total,
                'shipping_address' => $request->input('shipping_address'),
            ]);

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'unit_price' => $product->price,
                'quantity' => $qty,
                'total' => $subtotal,
            ]);

            

            return $order;
        });

        // Replace from line 108 onwards:
        try {
            $payment = $this->paystack->initializeTransaction($order->load(['buyer', 'seller']));
        } catch (\Throwable $e) {
            // Paystack failed — delete the order so it doesn't sit as pending
            $order->forceDelete();
            Log::error('Paystack initialization failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Payment initialization failed. Please check your connection and try again.',
            ], 503);
        }

        return response()->json([
            'order_id' => $order->id,
            'reference' => $order->reference,
            'authorization_url' => $payment['authorization_url'],
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
            $data = $this->paystack->verifyTransaction($reference);
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
        $payload = $request->getContent();
        $signature = $request->header('x-paystack-signature', '');

        if (!$this->paystack->verifyWebhook($payload, $signature)) {
            Log::warning('Paystack webhook: invalid signature');
            return response()->json(['ok' => false], 400);
        }

        $event = $request->json('event');
        $data = $request->json('data');

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
        // Re-credit seller wallet
        $lastTx = \App\Models\WalletTransaction::where('user_id', $payout->seller_id)->latest()->first();
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
            'status' => 'cancelled',
            'cancellation_reason' => $request->input('reason', 'Cancelled by buyer'),
        ]);

        return response()->json(['message' => 'Order cancelled.']);
    }

    public function apiShow(Order $order): JsonResponse
    {
        $userId = Auth::id();
        abort_unless($order->buyer_id === $userId || $order->seller_id === $userId, 403);

        return response()->json($order->load(['items.product', 'seller', 'buyer']));
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        // Only the seller of this order can update it
        if (Auth::id() !== $order->seller_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:processing,shipped,delivered,cancelled',
        ]);

        $order->update(['status' => $validated['status']]);

        return response()->json(['status' => $order->status]);
    }

    /**
 * POST /api/orders/resume-payment
 * Re-initializes a Paystack transaction for a pending order.
 * Used when buyer exits Paystack without completing payment.
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

    // Generate fresh payment reference
    $newReference = 'FLK_' . Str::upper(Str::random(16));

    $order->update([
        'reference' => $newReference,
    ]);

    $payment = $this->paystack->initializeTransaction($order->fresh());

    return response()->json([
        'authorization_url' => $payment['authorization_url'],
        'reference'         => $newReference,
    ]);
}
}
