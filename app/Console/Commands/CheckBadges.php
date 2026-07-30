<?php
// app/Console/Commands/CheckBadges.php
namespace App\Console\Commands;

use App\Models\Badge;
use App\Models\Order;
use App\Models\User;
use App\Models\UserBadge;
use Illuminate\Console\Command;

class CheckBadges extends Command
{
    protected $signature = 'badges:check';
    protected $description = 'Award earned badges to sellers based on current stats';

    public function handle(): void
    {
        $badges = Badge::pluck('id', 'key');

        User::where('role', 'seller')->chunk(100, function ($sellers) use ($badges) {
            foreach ($sellers as $seller) {
                $orders = Order::forSeller($seller->id)->paid()->count();
                $viral  = $seller->videos()->where('views_count', '>=', 1000)->exists();

                $this->award($seller->id, $badges['first_sale']       ?? null, $orders >= 1);
                $this->award($seller->id, $badges['ten_sales']        ?? null, $orders >= 10);
                $this->award($seller->id, $badges['viral_debut']      ?? null, $viral);
                $this->award($seller->id, $badges['hundred_followers']?? null, $seller->followers_count >= 100);
                $this->award($seller->id, $badges['pro_member']       ?? null, $seller->hasActiveSubscription());
            }
        });

        $this->info('Badge check complete.');
    }

    private function award(int $userId, ?int $badgeId, bool $earned): void
    {
        if (!$badgeId || !$earned) return;
        UserBadge::firstOrCreate(['user_id' => $userId, 'badge_id' => $badgeId], ['awarded_at' => now()]);
    }
}