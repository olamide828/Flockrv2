<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class UserDashboardController extends Controller
{
    const ACTIVE = ['paid', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'in_transit', 'pickup_failed', 'delivery_failed'];

    public function index(): Response
    {
        $user = Auth::user();

        // The images bug: order items were loaded WITHOUT their product, so the page had no image to show.
        // `items.product` brings the product (its `primary_image` accessor builds the full URL).
        $orders = $user->orders()
            ->with([
                'items.product:id,name,slug,images,price,stock_quantity,seller_id',
                'seller:id,name,username,avatar',
            ])
            ->latest()
            ->limit(60)
            ->get();

        $savedProducts = $user->savedProducts()
            ->with('seller:id,name,username')
            ->latest('product_saves.created_at')
            ->limit(60)
            ->get();

        $savedVideos = $user->savedVideos()
            ->with('user:id,name,username,avatar')
            ->whereNotNull('videos.ulid')
            ->latest('video_saves.created_at')
            ->limit(60)
            ->get();

        $coupons = Coupon::where('buyer_id', $user->id)
            ->whereNull('used_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderBy('expires_at')
            ->get(['id', 'code', 'amount', 'min_order', 'expires_at']);

        return Inertia::render('User/Dashboard', [
            'orders'        => $orders,
            'savedProducts' => $savedProducts,
            'savedVideos'   => $savedVideos,
            'coupons'       => $coupons,
            'stats'         => [
                'orders'       => $user->orders()->count(),
                'active'       => $user->orders()->whereIn('status', self::ACTIVE)->count(),
                'following'    => $user->following()->count(),
                'restocked'    => $savedProducts->filter(fn ($p) => $p->just_restocked)->count(),
            ],
        ]);
    }
}
