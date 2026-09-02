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
use Illuminate\Support\Str;
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
        $addresses = UserAddress::where('user_id', Auth::id())
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
    $validated = $request->validate([
        'code'     => 'required|string',
        'subtotal' => 'nullable|numeric|min:0',
    ]);

    $coupon = Coupon::where('code', strtoupper(trim($validated['code'])))
        ->where('buyer_id', Auth::id())
        ->whereNull('used_at')
        ->where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        })
        ->first();

    if (!$coupon) {
        return response()->json(['message' => 'Invalid or expired coupon code.'], 422);
    }

    // Prefer the subtotal the frontend is actually checking out with —
    // works correctly for both single-product "Buy Now" and cart checkout.
    // Falls back to the persisted cart only when none was supplied.
    if ($request->filled('subtotal')) {
        $subtotal = (float) $validated['subtotal'];
    } else {
        $items    = CartItem::where('user_id', Auth::id())->with('product')->get();
        $subtotal = $items->sum(fn($i) => $i->product->price * $i->quantity);
    }

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
    /**
     * POST /api/cart/checkout
     *
     * Single-seller cart: same as before — one rate_id/carrier/courier_fee at
     * the top level.
     * Multi-seller cart: a `rates` map keyed by seller_id, each holding that
     * seller's own {rate_id, carrier, amount} — required because each seller
     * ships from a different physical pickup address and cannot share one
     * courier rate.
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address_id'             => 'required|integer|exists:user_addresses,id',
            'rate_id'                => 'nullable|string',
            'carrier'                => 'nullable|string|max:100',
            'courier_fee'            => 'nullable|numeric|min:0',
            'rates'                  => 'nullable|array',
            'delivery_platform_fee'  => 'nullable|numeric|min:0',
            'coupon_code'            => 'nullable|string',
        ]);

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

        if ($items->contains(fn($i) => $i->product->seller_id === Auth::id())) {
            return response()->json([
                'message' => 'You cannot purchase your own products. Please remove them from your cart.',
            ], 422);
        }

        foreach ($items as $item) {
            if ($item->product->stock_quantity < $item->quantity) {
                return response()->json([
                    'message' => "Not enough stock for \"{$item->product->name}\".",
                ], 422);
            }
        }

        $grouped = $items->groupBy(fn($i) => $i->product->seller_id);

        // Each seller needs its own courier rate — physically separate pickup
        // addresses can't share one shipment. If the frontend sent a per-seller
        // `rates` map, use it. Otherwise fall back to the legacy single-rate
        // shape, which only remains valid for a genuinely single-seller cart.
        $ratesBySeller = $validated['rates'] ?? null;
        if (!$ratesBySeller && $grouped->count() === 1) {
            $onlySellerId = $grouped->keys()->first();
            $ratesBySeller = [
                (string) $onlySellerId => [
                    'rate_id' => $validated['rate_id'] ?? null,
                    'carrier' => $validated['carrier'] ?? null,
                    'amount'  => $validated['courier_fee'] ?? 0,
                ],
            ];
        }

        $missingRate = !$ratesBySeller || $grouped->keys()->contains(
            fn($sellerId) => empty($ratesBySeller[(string) $sellerId]['rate_id'] ?? null)
        );

        if ($missingRate) {
            return response()->json(['message' => 'Missing courier selection for one or more sellers.'], 422);
        }

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

        $orders     = [];
        $grandTotal = 0;
        $batchId    = (string) Str::uuid();

        DB::transaction(function () use (
            $grouped, $address, $validated, $coupon,
            $couponDiscount, $ratesBySeller, $batchId, &$orders, &$grandTotal
        ) {
            $isFirstOrder      = true;
            $remainingDiscount = $couponDiscount;

            foreach ($grouped as $sellerId => $sellerItems) {

                $sellerRate = $ratesBySeller[(string) $sellerId] ?? null;
                $courierFee = (float) ($sellerRate['amount'] ?? 0);

                $subtotal    = $sellerItems->sum(fn($i) => $i->product->price * $i->quantity);
                $platformFee = round($subtotal * config('flockr.platform_fee_percent', 5) / 100, 2);

                // Flockr's own delivery-management fee still only applies once
                // per checkout — that part genuinely is shared, unlike courier cost.
                $thisDeliveryPlatformFee = $isFirstOrder ? ($validated['delivery_platform_fee'] ?? 200) : 0;

                $discount = min($remainingDiscount, $subtotal);
                if ($discount > 0) {
                    $sellerShare = round($discount / 2, 2);
                    $flockrShare = $discount - $sellerShare;
                    $platformFee = max(0, $platformFee - $flockrShare);
                    $remainingDiscount -= $discount;
                }

                $total = $subtotal + $courierFee + $thisDeliveryPlatformFee - $discount;
                $grandTotal += $total;

                $order = Order::create([
                    'buyer_id'            => Auth::id(),
                    'seller_id'           => $sellerId,
                    'subtotal'            => $subtotal,
                    'shipping_fee'        => $courierFee,
                    'platform_fee'        => $platformFee,
                    'total'               => max(0, $total),
                    'shipping_address'    => $address->toTerminalFormat(),
                    'delivery_address_id' => $address->id,
                    'courier_name'        => $sellerRate['carrier'] ?? null,
                    'checkout_batch_id'   => $batchId,
                    // Each seller's own real courier cost — no longer zeroed
                    // for non-first orders, because each one now has a real,
                    // independently-arranged shipment.
                    'courier_fee'         => $courierFee,
                    'terminal_rate_id'    => $sellerRate['rate_id'] ?? null,
                    'estimated_delivery'  => $validated['delivery_date'] ?? null,
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

                if ($coupon && $isFirstOrder) {
                    $coupon->update(['used_on_order_id' => $order->id]);
                }

                $orders[]     = $order;
                $isFirstOrder = false;
            }
        });

        $primaryOrder = $orders[0];
        if (count($orders) > 1) {
            $primaryOrder->update(['total' => $grandTotal]);
        }

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
            'reference'          => $primaryOrder->reference,
            'coupon_applied'     => $coupon ? [
                'code'     => $coupon->code,
                'discount' => $couponDiscount,
            ] : null,
        ]);
    }
} 