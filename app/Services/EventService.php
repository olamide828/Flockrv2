<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Event;
use App\Models\Order;
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
}