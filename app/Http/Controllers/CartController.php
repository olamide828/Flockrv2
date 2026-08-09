<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\UserAddress;
use App\Services\PaystackService;
use App\Services\TerminalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function __construct(
        private readonly PaystackService $paystack,
        private readonly TerminalService $terminal,
    ) {}

    // GET /cart
    public function index(): Response
    {
        $items = CartItem::where('user_id', Auth::id())
            ->with(['product' => fn($q) => $q->with('seller:id,name,username,avatar,is_verified,pickup_street,pickup_city,pickup_state')])
            ->get()
            ->filter(fn($item) => $item->product && $item->product->status === 'active')
            ->values();

        // Load saved addresses for checkout modal
        $addresses = \App\Models\UserAddress::where('user_id', Auth::id())
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->get();

        return Inertia::render('Cart/Index', [
            'cartItems' => $items,
            'addresses' => $addresses,
        ]);
    }

    // POST /api/cart
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

        CartItem::updateOrCreate(
            ['user_id' => Auth::id(), 'product_id' => $product->id],
            ['quantity' => $validated['quantity']],
        );

        $count = CartItem::where('user_id', Auth::id())->count();

        return response()->json(['message' => 'Added to cart.', 'cart_count' => $count], 201);
    }

    // PATCH /api/cart/{item}
    public function update(Request $request, CartItem $item): JsonResponse
    {
        abort_unless($item->user_id === Auth::id(), 403);

        $validated = $request->validate(['quantity' => 'required|integer|min:1|max:100']);

        if ($item->product->stock_quantity < $validated['quantity']) {
            return response()->json(['message' => 'Not enough stock.'], 422);
        }

        $item->update(['quantity' => $validated['quantity']]);
        return response()->json(['ok' => true]);
    }

    // DELETE /api/cart/{item}
    public function remove(CartItem $item): JsonResponse
    {
        abort_unless($item->user_id === Auth::id(), 403);
        $item->delete();
        return response()->json(['ok' => true]);
    }

    // DELETE /api/cart
    public function clear(): JsonResponse
    {
        CartItem::where('user_id', Auth::id())->delete();
        return response()->json(['ok' => true]);
    }

    // GET /api/cart/count
    public function count(): JsonResponse
    {
        $count = Auth::check() ? CartItem::where('user_id', Auth::id())->count() : 0;
        return response()->json(['count' => $count]);
    }

    /**
     * POST /api/cart/validate-coupon
     * Validate a coupon code and return discount amount.
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string']);

        $coupon = Coupon::where('code', strtoupper(trim($request->code)))
            ->where('buyer_id', Auth::id())
            ->whereNull('used_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        if (!$coupon) {
            return response()->json(['message' => 'Invalid or expired coupon code.'], 422);
        }

        // Calculate cart total to check min_order
        $items    = CartItem::where('user_id', Auth::id())->with('product')->get();
        $subtotal = $items->sum(fn($i) => $i->product->price * $i->quantity);

        if ($subtotal < $coupon->min_order) {
            return response()->json([
                'message' => "This coupon requires a minimum order of ₦" . number_format($coupon->min_order, 0) . ".",
            ], 422);
        }

        return response()->json([
            'coupon' => [
                'id'         => $coupon->id,
                'code'       => $coupon->code,
                'amount'     => $coupon->amount,
                'min_order'  => $coupon->min_order,
                'expires_at' => $coupon->expires_at?->toDateString(),
            ],
        ]);
    }

    /**
     * POST /api/cart/checkout
     *
     * Expects:
     *   address_id   - buyer's saved delivery address ID
     *   rate_id      - Terminal rate ID selected by buyer
     *   carrier      - carrier name (for display)
     *   courier_fee  - courier fee amount in NGN
     *   coupon_code  - optional coupon code
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address_id'           => 'required|integer|exists:user_addresses,id',
            'rate_id'              => 'required|string',
            'carrier'              => 'required|string|max:100',
            'courier_fee'          => 'required|numeric|min:0',
            'delivery_platform_fee'=> 'nullable|numeric|min:0',
            'coupon_code'          => 'nullable|string',
        ]);

        // Verify address belongs to buyer
        $address = UserAddress::where('id', $validated['address_id'])
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $items = CartItem::where('user_id', Auth::id())
            ->with('product')
            ->get()
            ->filter(fn($i) => $i->product && $i->product->status === 'active');

        if ($items->isEmpty()) {
            return response()->json(['message' => 'Your cart is empty.'], 422);
        }

        // Validate stock
        foreach ($items as $item) {
            if ($item->product->stock_quantity < $item->quantity) {
                return response()->json([
                    'message' => "Not enough stock for \"{$item->product->name}\".",
                ], 422);
            }
        }

        // ── Coupon ────────────────────────────────────────────────────────────
        $coupon         = null;
        $couponDiscount = 0;

        if (!empty($validated['coupon_code'])) {
            $coupon = Coupon::where('code', strtoupper(trim($validated['coupon_code'])))
                ->where('buyer_id', Auth::id())
                ->whereNull('used_at')
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->first();

            if ($coupon) {
                $subtotalCheck = $items->sum(fn($i) => $i->product->price * $i->quantity);
                if ($subtotalCheck >= $coupon->min_order) {
                    $couponDiscount = (float) $coupon->amount;
                }
            }
        }

        // ── Build orders (one per seller) ────────────────────────────────────
        $grouped    = $items->groupBy(fn($i) => $i->product->seller_id);
        $orders     = [];
        $grandTotal = 0;
        $courierFee = (float) $validated['courier_fee'];

        DB::transaction(function () use (
            $grouped, $address, $validated, $coupon,
            $couponDiscount, $courierFee, &$orders, &$grandTotal
        ) {
            $isFirstOrder    = true;
            $remainingDiscount = $couponDiscount;

            foreach ($grouped as $sellerId => $sellerItems) {
                $subtotal    = $sellerItems->sum(fn($i) => $i->product->price * $i->quantity);
                $platformFee = round($subtotal * config('flockr.platform_fee_percent', 5) / 100, 2);

                // Apply courier fee only on first order (one shipment per checkout)
                $thisOrderCourierFee   = $isFirstOrder ? $courierFee : 0;
                $thisDeliveryPlatformFee = $isFirstOrder ? ($validated['delivery_platform_fee'] ?? 200) : 0;

                // Apply coupon discount — split 50/50 seller/Flockr
                $discount = min($remainingDiscount, $subtotal);
                if ($discount > 0) {
                    $sellerShare  = round($discount / 2, 2);
                    $flockrShare  = $discount - $sellerShare;
                    $platformFee  = max(0, $platformFee - $flockrShare);
                    $remainingDiscount -= $discount;
                }

                $total = $subtotal + $thisOrderCourierFee + $thisDeliveryPlatformFee - $discount;
                $grandTotal += $total;

                $order = Order::create([
                    'buyer_id'             => Auth::id(),
                    'seller_id'            => $sellerId,
                    'subtotal'             => $subtotal,
                    'shipping_fee'         => $thisOrderCourierFee,
                    'platform_fee'         => $platformFee,
                    'total'                => max(0, $total),
                    'shipping_address'     => $address->toTerminalFormat(),
                    'delivery_address_id'  => $address->id,
                    'courier_name'  => $validated['carrier'] ?? null,
                    'courier_fee'   => $validated['courier_fee'] ?? 0,
                    'terminal_rate_id' => $validated['rate_id'] ?? null,
                    'estimated_delivery' => $validated['delivery_date'] ?? null,
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

                // Reserve coupon
                if ($coupon && $isFirstOrder) {
                    $coupon->update(['used_on_order_id' => $order->id]);
                }

                $orders[]     = $order;
                $isFirstOrder = false;
            }
        });

        // Use first order as primary Paystack transaction
        $primaryOrder = $orders[0];
        if (count($orders) > 1) {
            $primaryOrder->update(['total' => $grandTotal]);
        }

        session(['cart_order_ids' => collect($orders)->pluck('id')->toArray()]);

        try {
            $payment = $this->paystack->initializeTransaction(
                $primaryOrder->load(['buyer', 'seller'])
            );
        } catch (\Throwable $e) {
            foreach ($orders as $order) $order->forceDelete();
            if ($coupon) $coupon->update(['used_on_order_id' => null]);
            Log::error('Cart checkout Paystack failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Payment initialization failed. Please try again.'], 503);
        }

        CartItem::where('user_id', Auth::id())->delete();

        return response()->json([
            'authorization_url' => $payment['authorization_url'],
            'reference'         => $primaryOrder->reference,
            'coupon_applied'    => $coupon ? [
                'code'     => $coupon->code,
                'discount' => $couponDiscount,
            ] : null,
        ]);
    }
} 