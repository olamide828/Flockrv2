<?php
namespace App\Console\Commands;

use App\Models\Badge;
use App\Models\Order;
use App\Models\User;
use App\Models\UserBadge;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckBadges extends Command
{
    protected $signature = 'badges:check';
    protected $description = 'Award earned badges to sellers and buyers based on current stats';

    public function handle(): void
    {
        $badges = Badge::pluck('id', 'key');

        User::where('role', 'seller')->chunk(100, function ($sellers) use ($badges) {
            foreach ($sellers as $seller) {
                $orders = Order::forSeller($seller->id)->paid()->count();
                $viral  = $seller->videos()->where('views_count', '>=', 1000)->exists();

                $this->award($seller->id, $badges['first_sale']        ?? null, $orders >= 1);
                $this->award($seller->id, $badges['ten_sales']         ?? null, $orders >= 10);
                $this->award($seller->id, $badges['viral_debut']       ?? null, $viral);
                $this->award($seller->id, $badges['hundred_followers'] ?? null, $seller->followers_count >= 100);
                $this->award($seller->id, $badges['pro_member']        ?? null, $seller->hasActiveSubscription());
            }
        });

        User::where('role', 'buyer')->chunk(100, function ($buyers) use ($badges) {
            foreach ($buyers as $buyer) {
                $orderCount   = Order::where('buyer_id', $buyer->id)->paid()->count();
                $hasSaved     = DB::table('product_saves')->where('user_id', $buyer->id)->exists();
                $loginStreak  = $this->consecutiveLoginDays($buyer->id);

                $this->award($buyer->id, $badges['first_purchase']   ?? null, $orderCount >= 1);
                $this->award($buyer->id, $badges['five_purchases']   ?? null, $orderCount >= 5);
                $this->award($buyer->id, $badges['wishlist_starter'] ?? null, $hasSaved);
                $this->award($buyer->id, $badges['loyal_shopper']    ?? null, $loginStreak >= 3);
            }
        });

        $this->info('Badge check complete.');
    }

    private function consecutiveLoginDays(int $userId): int
    {
        $dates = \App\Models\LoginHistory::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->pluck('created_at')
            ->map(fn ($d) => $d->format('Y-m-d'))
            ->unique()
            ->values();

        $streak = 0;
        $cursor = now()->startOfDay();
        foreach ($dates as $date) {
            if ($date === $cursor->format('Y-m-d')) {
                $streak++;
                $cursor->subDay();
            } else {
                break;
            }
        }
        return $streak;
    }

    private function award(int $userId, ?int $badgeId, bool $earned): void
    {
        if (!$badgeId || !$earned) return;
        UserBadge::firstOrCreate(['user_id' => $userId, 'badge_id' => $badgeId], ['awarded_at' => now()]);
    }
}