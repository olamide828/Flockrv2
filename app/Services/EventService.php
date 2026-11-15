<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Event;
use App\Models\Badge;
use App\Models\Order;
use App\Models\UserBadge;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EventService
{
    
    public function checkScavengerHunt(Order $order): void
    {
        $events = Event::currentlyActive()
            ->whereNotNull('scavenger_hunt_target')
            ->whereHas('participants', fn($q) => $q->where('seller_id', $order->seller_id))
            ->get();

        foreach ($events as $event) {
            $alreadyRewarded = DB::table('event_rewards')
                ->where('event_id', $event->id)
                ->where('user_id', $order->buyer_id)
                ->where('type', 'scavenger_hunt')
                ->exists();

            if ($alreadyRewarded) continue;

            $participatingSellerIds = $event->participants()->pluck('seller_id');

            $distinctSellersBoughtFrom = Order::where('buyer_id', $order->buyer_id)
                ->whereIn('seller_id', $participatingSellerIds)
                ->whereNotIn('status', ['pending', 'cancelled', 'refunded'])
                ->whereBetween('created_at', [$event->starts_at, $event->ends_at])
                ->distinct('seller_id')
                ->count('seller_id');

            if ($distinctSellersBoughtFrom < $event->scavenger_hunt_target) continue;

            DB::transaction(function () use ($event, $order) {
                Coupon::create([
                    'code'       => 'HUNT-' . strtoupper(Str::random(4)) . '-' . strtoupper(Str::random(4)),
                    'buyer_id'   => $order->buyer_id,
                    'amount'     => $event->scavenger_hunt_coupon_amount ?? 500,
                    'min_order'  => 2000,
                    'expires_at' => now()->addDays(14),
                ]);

                DB::table('event_rewards')->insert([
                    'event_id'   => $event->id,
                    'user_id'    => $order->buyer_id,
                    'type'       => 'scavenger_hunt',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

            try {
                $order->buyer->notify(new \App\Notifications\OrderStatusNotification(
                    $order,
                    "🎉 {$event->title} reward unlocked!",
                    "You bought from {$event->scavenger_hunt_target} different sellers — check your coupons for a surprise reward."
                ));
            } catch (\Throwable) {}
        }
    }

    public function notifySellersUpcoming(Event $event): void
{
    \App\Models\User::where('role', 'seller')->where('is_active', true)
        ->chunk(200, function ($sellers) use ($event) {
            foreach ($sellers as $seller) {
                try {
                    $seller->notify(new \App\Notifications\EventAnnouncementNotification(
                        $event,
                        "📅 {$event->title} is coming!",
                        "Join now and pick your discount tier before it goes live on " . $event->starts_at->format('M j, g:ia') . "."
                    ));
                } catch (\Throwable) {}
            }
        });
}

public function notifyEventLive(Event $event): void
{
    \App\Models\User::where('is_active', true)
        ->chunk(200, function ($users) use ($event) {
            foreach ($users as $user) {
                try {
                    $user->notify(new \App\Notifications\EventAnnouncementNotification(
                        $event,
                        "🎉 {$event->title} is live now!",
                        $event->description ?? 'Check out the deals before they end.'
                    ));
                } catch (\Throwable) {}
            }
        });
}


    /** Live (or final) numbers per participating seller, ranked by revenue. */
    public function standings(Event $event): \Illuminate\Support\Collection
    {
        $participants = $event->participants()->with('seller:id,name,username,avatar')->get();

        $stats = Order::whereIn('seller_id', $participants->pluck('seller_id'))
            ->whereNotIn('status', ['pending', 'cancelled', 'refunded'])
            ->whereBetween('created_at', [$event->starts_at, $event->ends_at])
            ->select('seller_id', DB::raw('COUNT(*) as orders_count'), DB::raw('SUM(total - platform_fee) as revenue'))
            ->groupBy('seller_id')->get()->keyBy('seller_id');

        $rows = $participants->map(fn ($p) => [
            'seller_id'        => $p->seller_id,
            'seller'           => $p->seller,
            'discount_percent' => $p->discount_percent,
            'orders_count'     => (int) ($stats->get($p->seller_id)->orders_count ?? 0),
            'revenue'          => (float) ($stats->get($p->seller_id)->revenue ?? 0),
            'participant'      => $p,
        ])->sortByDesc('revenue')->values();

        return $rows->map(function ($r, $i) use ($rows) {
            $r['rank'] = $i + 1;
            $r['total_sellers'] = $rows->count();
            return $r;
        });
    }

    /**
     * Close an event: freeze each seller's final stats, notify them and crown the champion.
     * Used by BOTH the hourly command and the admin "End now" button, so an event ended by hand
     * gets results and a champion too (before, only naturally-expiring events did).
     */
    public function finalize(Event $event): void
    {
        if ($event->status === 'ended' && $event->participants()->whereNull('final_stats')->doesntExist()) {
            return;
        }

        $standings = $this->standings($event);
        $topSellerId = $standings->first()['revenue'] > 0 ? $standings->first()['seller_id'] : null;

        foreach ($standings as $row) {
            $final = ['orders_count' => $row['orders_count'], 'revenue' => $row['revenue'], 'rank' => $row['rank'], 'total_sellers' => $row['total_sellers']];
            $row['participant']->update(['final_stats' => $final]);

            try {
                $row['seller']?->notify(new \App\Notifications\EventNotification(
                    $event,
                    "{$event->title} has ended",
                    "You made {$final['orders_count']} sale(s) worth ₦" . number_format($final['revenue'], 0) . " — ranked #{$final['rank']} of {$final['total_sellers']} participating sellers. Open Seller Dashboard to see your results."
                ));
            } catch (\Throwable) {}
        }

        if ($topSellerId) {
            $badge = Badge::firstOrCreate(
                ['key' => 'event_champion_' . $event->id],
                ['label' => "{$event->title} Champion", 'description' => "Top seller during {$event->title}", 'image_path' => 'badges/event_champion.png']
            );
            UserBadge::firstOrCreate(['user_id' => $topSellerId, 'badge_id' => $badge->id], ['awarded_at' => now()]);
        }

        $event->update(['status' => 'ended']);
    }

    /** A buyer's scavenger-hunt progress for one event (read-only; the reward itself is granted in checkScavengerHunt). */
    public function huntProgress(Event $event, int $buyerId): ?array
    {
        if (!$event->scavenger_hunt_target) return null;

        $participating = $event->participants()->pluck('seller_id');
        $boughtFrom = Order::where('buyer_id', $buyerId)
            ->whereIn('seller_id', $participating)
            ->whereNotIn('status', ['pending', 'cancelled', 'refunded'])
            ->whereBetween('created_at', [$event->starts_at, $event->ends_at])
            ->distinct()->pluck('seller_id');

        return [
            'event_id'    => $event->id,
            'title'       => $event->title,
            'target'      => (int) $event->scavenger_hunt_target,
            'bought_from' => $boughtFrom->count(),
            'remaining'   => max(0, (int) $event->scavenger_hunt_target - $boughtFrom->count()),
            'reward'      => (float) ($event->scavenger_hunt_coupon_amount ?? 500),
            'rewarded'    => DB::table('event_rewards')->where('event_id', $event->id)->where('user_id', $buyerId)->where('type', 'scavenger_hunt')->exists(),
            'ends_at'     => $event->ends_at,
            'live'        => $event->isLive(),
        ];
    }
}
