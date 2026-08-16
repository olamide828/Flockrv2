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
    protected $description = 'Award earned badges to all users, checking both seller and buyer milestones regardless of role';

    public function handle(): void
    {
        $badges = Badge::pluck('id', 'key');
        $sellerAwarded = 0;
        $buyerAwarded = 0;

        User::chunk(100, function ($users) use ($badges, &$sellerAwarded, &$buyerAwarded) {
            foreach ($users as $user) {
                // ── Seller-side checks — run for ANYONE with a seller role,
                // since only sellers can have videos/products to earn these ──
                if ($user->role === 'seller') {
                    $orders = Order::forSeller($user->id)->paid()->count();
                    $viral  = $user->videos()->where('views_count', '>=', 1000)->exists();

                    $sellerAwarded += (int) $this->award($user->id, $badges['first_sale']        ?? null, $orders >= 1);
                    $sellerAwarded += (int) $this->award($user->id, $badges['ten_sales']         ?? null, $orders >= 10);
                    $sellerAwarded += (int) $this->award($user->id, $badges['viral_debut']       ?? null, $viral);
                    $sellerAwarded += (int) $this->award($user->id, $badges['hundred_followers'] ?? null, $user->followers_count >= 100);
                    $sellerAwarded += (int) $this->award($user->id, $badges['pro_member']        ?? null, $user->hasActiveSubscription());
                }

                // ── Buyer-side checks — run for EVERY user, regardless of
                // role, since a seller can also place orders as a buyer ──
                $orderCount  = Order::where('buyer_id', $user->id)->paid()->count();
                $hasSaved    = DB::table('product_saves')->where('user_id', $user->id)->exists();
                $loginStreak = $this->consecutiveLoginDays($user->id);

                $buyerAwarded += (int) $this->award($user->id, $badges['first_purchase']   ?? null, $orderCount >= 1);
                $buyerAwarded += (int) $this->award($user->id, $badges['five_purchases']   ?? null, $orderCount >= 5);
                $buyerAwarded += (int) $this->award($user->id, $badges['wishlist_starter'] ?? null, $hasSaved);
                $buyerAwarded += (int) $this->award($user->id, $badges['loyal_shopper']    ?? null, $loginStreak >= 3);
            }
        });

        $this->info("Badge check complete. Seller badges newly awarded: {$sellerAwarded}. Buyer badges newly awarded: {$buyerAwarded}.");
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

    private function award(int $userId, ?int $badgeId, bool $earned): bool
    {
        if (!$badgeId || !$earned) return false;
        $result = UserBadge::firstOrCreate(['user_id' => $userId, 'badge_id' => $badgeId], ['awarded_at' => now()]);
        return $result->wasRecentlyCreated;
    }
}