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

class OrderController extends Controller
{
    public function __construct(private readonly PaystackService $paystack) {}

    // ── Inertia pages ─────────────────────────────────────────────────────────

    public function index(): Response
    {
        $orders = Auth::user()
            ->orders()
            ->with([
                'seller:id,name,username,avatar',
                'items.product:id,images',
            ])
            ->latest()
            ->paginate(20);

        return Inertia::render('Order/Index', ['orders' => $orders->items()]);
    }

    public function show(Order $order): Response
    {
        $this->authorize('view', $order);
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
            'quantity'   => 'required|integer|min:1|max:100',
        ]);

        $product = Product::active()->inStock()->findOrFail($validated['product_id']);
        $qty     = $validated['quantity'];

        if ($product->stock_quantity < $qty) {
            return response()->json(['message' => 'Not enough stock available.'], 422);
        }

        $subtotal    = $product->price * $qty;
        $shipping    = $product->shipping_fee;
        $platformFee = round($subtotal * config('flockr.platform_fee_percent', 5) / 100, 2);
        $total       = $subtotal + $shipping;

        $order = DB::transaction(function () use ($product, $qty, $subtotal, $shipping, $platformFee, $total, $request) {
            $order = Order::create([
                'buyer_id'       => Auth::id(),
                'seller_id'      => $product->seller_id,
                'video_id'       => $request->input('video_id'),
                'subtotal'       => $subtotal,
                'shipping_fee'   => $shipping,
                'platform_fee'   => $platformFee,
                'total'          => $total,
                'shipping_address' => $request->input('shipping_address'),
            ]);

            OrderItem::create([
                'order_id'      => $order->id,
                'product_id'    => $product->id,
                'product_name'  => $product->name,
                'unit_price'    => $product->price,
                'quantity'      => $qty,
                'total'         => $subtotal,
            ]);

            return $order;
        });

        $payment = $this->paystack->initializeTransaction($order->load(['buyer', 'seller']));

        return response()->json([
            'order_id'          => $order->id,
            'reference'         => $order->reference,
            'authorization_url' => $payment['authorization_url'],
        ]);
    }

    /**
     * GET /orders/callback  — Paystack redirects here after payment
     */
    public function paystackCallback(Request $request): \Illuminate\Http\RedirectResponse
    {
        $reference = $request->query('reference') ?? $request->query('trxref');
        if (!$reference) return redirect()->route('home')->with('error', 'Invalid payment reference.');

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

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/orders/{order}/cancel
     */
    public function cancel(Order $order, Request $request): JsonResponse
    {
        $this->authorize('cancel', $order);

        if (!$order->canBeCancelled()) {
            return response()->json(['message' => 'This order cannot be cancelled.'], 422);
        }

        $order->update([
            'status'               => 'cancelled',
            'cancellation_reason'  => $request->input('reason', 'Cancelled by buyer'),
        ]);

        return response()->json(['message' => 'Order cancelled.']);
    }

    public function apiShow(Order $order): JsonResponse
    {
        $this->authorize('view', $order);
        return response()->json($order->load(['items.product', 'seller', 'buyer']));
    }
}
