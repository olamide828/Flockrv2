<?php

namespace App\Console\Commands;

use App\Models\Badge;
use App\Models\Event;
use App\Models\Order;
use App\Models\UserBadge;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AwardEventChampions extends Command
{
    protected $signature = 'events:award-champions';
    protected $description = 'For events that have just ended, award the top-selling participating seller a Champion badge';

    public function handle(): void
    {
        $endedEvents = Event::where('status', 'active')
            ->where('ends_at', '<=', now())
            ->get();

        foreach ($endedEvents as $event) {
            $topSellerId = Order::whereIn('seller_id', $event->participants()->pluck('seller_id'))
                ->whereNotIn('status', ['pending', 'cancelled', 'refunded'])
                ->whereBetween('created_at', [$event->starts_at, $event->ends_at])
                ->select('seller_id', DB::raw('SUM(total - platform_fee) as revenue'))
                ->groupBy('seller_id')
                ->orderByDesc('revenue')
                ->value('seller_id');

            if ($topSellerId) {
                $badgeKey = 'event_champion_' . $event->id;

                $badge = Badge::firstOrCreate(
                    ['key' => $badgeKey],
                    ['label' => "{$event->title} Champion", 'description' => "Top seller during {$event->title}"]
                );

                UserBadge::firstOrCreate(
                    ['user_id' => $topSellerId, 'badge_id' => $badge->id],
                    ['awarded_at' => now()]
                );

                $this->info("Awarded '{$badge->label}' to seller #{$topSellerId}");
            }

            $event->update(['status' => 'ended']);
        }

        $this->info('Done. ' . $endedEvents->count() . ' event(s) processed.');
    }
}