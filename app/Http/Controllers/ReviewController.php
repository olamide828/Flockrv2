<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\Review;
use App\Notifications\CouponEarnedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ReviewController extends Controller
{
    /**
     * POST /api/orders/{order}/review
     */
    public function store(Request $request, Order $order): JsonResponse
    {
        if (Auth::id() !== $order->buyer_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($order->status !== 'delivered') {
            return response()->json(['message' => 'You can only review a delivered order.'], 422);
        }

        // Change to 12 for production, 1 for testing
        $minHours = 24;
        if (!$order->delivered_at || $order->delivered_at->diffInHours(now()) < $minHours) {
            return response()->json([
                'message' => "Reviews can be submitted {$minHours} hour(s) after delivery.",
            ], 422);
        }

        if (Review::where('order_id', $order->id)->exists()) {
            return response()->json(['message' => 'You have already reviewed this order.'], 422);
        }

        $validated = $request->validate([
            'rating'   => 'required|integer|min:1|max:5',
            'body'     => 'nullable|string|max:1000',
            'photos'   => 'nullable|array|max:3',
            'photos.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // Upload photos
        $photoKeys = [];
        if ($request->hasFile('photos')) {
            $disk = config('filesystems.default', 'public');
            foreach ($request->file('photos') as $file) {
                $photoKeys[] = $file->store('reviews/' . now()->format('Y/m'), $disk);
            }
        }

        // Rating 5 with no photos → 4.5
        $rating = (float) $validated['rating'];
        if ($rating === 5.0 && empty($photoKeys)) {
            $rating = 4.5;
        }

        [$review, $coupon] = DB::transaction(function () use ($order, $rating, $validated, $photoKeys) {
            $review = Review::create([
                'order_id'  => $order->id,
                'buyer_id'  => $order->buyer_id,
                'seller_id' => $order->seller_id,
                'rating'    => $rating,
                'body'      => $validated['body'] ?? null,
                'photos'    => !empty($photoKeys) ? $photoKeys : null,
            ]);

            DB::statement("
    UPDATE users SET
        avg_rating    = (
            SELECT ROUND(AVG(avg_rating)::numeric, 2)
            FROM products
            WHERE seller_id = ? AND total_reviews > 0
        ),
        total_reviews = (
            SELECT COALESCE(SUM(total_reviews), 0)
            FROM products
            WHERE seller_id = ?
        )
    WHERE id = ?
", [$order->seller_id, $order->seller_id, $order->seller_id]);

            $coupon = Coupon::create([
                'code' => 'FLKRATE-' . strtoupper(Str::random(4)) . '-' . strtoupper(Str::random(4)),
                'buyer_id'   => $order->buyer_id,
                'review_id'  => $review->id,
                'amount'     => 200,
                'min_order'  => 2000,
                'expires_at' => now()->addDays(30),
            ]);

            return [$review, $coupon];
        });

        try {
            Auth::user()->notify(new CouponEarnedNotification($coupon));
        } catch (\Throwable $e) {
            Log::warning('CouponEarnedNotification failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'message' => 'Review submitted! You earned a ₦200 coupon.',
            'review'  => $review,
            'coupon'  => [
                'code'       => $coupon->code,
                'amount'     => $coupon->amount,
                'min_order'  => $coupon->min_order,
                'expires_at' => $coupon->expires_at?->toDateString(),
            ],
        ], 201);
    }

    /**
     * GET /api/orders/{order}/review
     */
    public function show(Order $order): JsonResponse
    {
        if (Auth::id() !== $order->buyer_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $review  = Review::where('order_id', $order->id)->first();
        $minHours = 24; // match store() — change both to 12 in production

        return response()->json([
            'reviewed'   => (bool) $review,
            'review'     => $review,
            'can_review' => $order->status === 'delivered'
                            && $order->delivered_at
                            && $order->delivered_at->diffInHours(now()) >= $minHours
                            && !$review,
        ]);
    }
}