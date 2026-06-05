<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\PaystackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function __construct(private readonly PaystackService $paystack) {}

    // GET /cart — Cart page
    public function index(): Response
    {
        $items = CartItem::where('user_id', Auth::id())
            ->with(['product' => fn($q) => $q->with('seller:id,name,username,avatar,is_verified')])
            ->get()
            ->filter(fn($item) => $item->product && $item->product->status === 'active')
            ->values();

        return Inertia::render('Cart/Index', [
            'cartItems' => $items,
        ]);
    }

    // POST /api/cart — Add to cart
    public function add(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity'   => 'required|integer|min:1|max:100',
        ]);

        $product = Product::active()->findOrFail($validated['product_id']);

        if ($product->stock_quantity < $validated['quantity']) {
            return response()->json(['message' => 'Not enough stock available.'], 422);
        }

        $item = CartItem::updateOrCreate(
            ['user_id' => Auth::id(), 'product_id' => $product->id],
            ['quantity' => $validated['quantity']],
        );

        $count = CartItem::where('user_id', Auth::id())->count();

        return response()->json([
            'message' => 'Added to cart.',
            'cart_count' => $count,
        ], 201);
    }

    // PATCH /api/cart/{item} — Update quantity
    public function update(Request $request, CartItem $item): JsonResponse
    {
        abort_unless($item->user_id === Auth::id(), 403);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1|max:100',
        ]);

        if ($item->product->stock_quantity < $validated['quantity']) {
            return response()->json(['message' => 'Not enough stock.'], 422);
        }

        $item->update(['quantity' => $validated['quantity']]);

        return response()->json(['ok' => true]);
    }

    // DELETE /api/cart/{item} — Remove item
    public function remove(CartItem $item): JsonResponse
    {
        abort_unless($item->user_id === Auth::id(), 403);
        $item->delete();
        return response()->json(['ok' => true]);
    }

    // DELETE /api/cart — Clear entire cart
    public function clear(): JsonResponse
    {
        CartItem::where('user_id', Auth::id())->delete();
        return response()->json(['ok' => true]);
    }

    // GET /api/cart/count — Badge count
    public function count(): JsonResponse
    {
        $count = Auth::check()
            ? CartItem::where('user_id', Auth::id())->count()
            : 0;
        return response()->json(['count' => $count]);
    }

    // POST /api/cart/checkout — Create orders and redirect to Paystack
    public function checkout(Request $request): JsonResponse
    {
        $items = CartItem::where('user_id', Auth::id())
            ->with('product')
            ->get()
            ->filter(fn($i) => $i->product && $i->product->status === 'active');

        if ($items->isEmpty()) {
            return response()->json(['message' => 'Your cart is empty.'], 422);
        }

        // Validate stock for all items first
        foreach ($items as $item) {
            if ($item->product->stock_quantity < $item->quantity) {
                return response()->json([
                    'message' => "Not enough stock for \"{$item->product->name}\".",
                ], 422);
            }
        }

        // Group by seller — one order per seller
        $grouped = $items->groupBy(fn($i) => $i->product->seller_id);

        $orders = [];
        $grandTotal = 0;

        DB::transaction(function () use ($grouped, &$orders, &$grandTotal, $request) {
            foreach ($grouped as $sellerId => $sellerItems) {
                $subtotal    = $sellerItems->sum(fn($i) => $i->product->price * $i->quantity);
                $shipping    = $sellerItems->max(fn($i) => $i->product->shipping_fee ?? 0);
                $platformFee = round($subtotal * config('flockr.platform_fee_percent', 5) / 100, 2);
                $total       = $subtotal + $shipping;
                $grandTotal += $total;

                $order = Order::create([
                    'buyer_id'         => Auth::id(),
                    'seller_id'        => $sellerId,
                    'subtotal'         => $subtotal,
                    'shipping_fee'     => $shipping,
                    'platform_fee'     => $platformFee,
                    'total'            => $total,
                    'shipping_address' => $request->input('shipping_address'),
                ]);

                foreach ($sellerItems as $item) {
                    OrderItem::create([
                        'order_id'     => $order->id,
                        'product_id'   => $item->product_id,
                        'product_name' => $item->product->name,
                        'unit_price'   => $item->product->price,
                        'quantity'     => $item->quantity,
                        'total'        => $item->product->price * $item->quantity,
                    ]);
                }

                $orders[] = $order;
            }
        });

        // Use first order for Paystack — we pass grand total as the amount
        // Paystack will process one payment; callback marks all orders as paid
        $primaryOrder = $orders[0];
        $primaryOrder->update(['total' => $grandTotal]); // combined total for payment

        // Store all order IDs in session to mark them all paid on callback
        session(['cart_order_ids' => collect($orders)->pluck('id')->toArray()]);

        try {
            $payment = $this->paystack->initializeTransaction(
                $primaryOrder->load(['buyer', 'seller'])
            );
        } catch (\Throwable $e) {
            // Payment failed — delete all orders
            foreach ($orders as $order) {
                $order->forceDelete();
            }
            Log::error('Cart checkout Paystack failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Payment initialization failed. Please try again.',
            ], 503);
        }

        // Clear cart after successful payment init
        CartItem::where('user_id', Auth::id())->delete();

        return response()->json([
            'authorization_url' => $payment['authorization_url'],
            'reference'         => $primaryOrder->reference,
        ]);
    }
}