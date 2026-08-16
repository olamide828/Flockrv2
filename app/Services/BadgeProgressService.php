<?php
namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BadgeProgressService
{
    public function currentValue(User $user, string $metric): int
    {
        return match ($metric) {
            'seller_orders'    => Order::forSeller($user->id)->paid()->count(),
            'buyer_orders'     => Order::where('buyer_id', $user->id)->paid()->count(),
            'max_video_views'  => (int) $user->videos()->max('views_count'),
            'followers_count'  => $user->followers_count ?? 0,
            'saved_products'   => DB::table('product_saves')->where('user_id', $user->id)->count(),
            'upload_streak'    => app(GamificationService::class)->forSeller($user)['streak_days'] ?? 0,
            'visit_streak'     => app(GamificationService::class)->forBuyer($user)['streak_days'] ?? 0,
            default            => 0,
        };
    }
}