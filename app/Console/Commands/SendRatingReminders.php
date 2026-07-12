<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\Review;
use App\Notifications\RatingReminderNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class SendRatingReminders extends Command
{
    protected $signature   = 'flockr:send-rating-reminders';
    protected $description = 'Send rating reminders to buyers at 24h, 72h, and 7d after delivery';

    // The three intervals we remind at, in hours
    private array $intervals = [24, 72, 168]; // 24h, 72h, 7 days

    // [24, 72, 168];

    public function handle(): int
    {
        $now  = now();
        $sent = 0;

        foreach ($this->intervals as $hours) {
            // Window: delivered_at is within this interval ± 55 minutes
            // (command runs hourly, so ±55min catches any drift)
            $windowStart = $now->copy()->subHours($hours)->subMinutes(30);
            $windowEnd   = $now->copy()->subHours($hours)->addMinutes(55);

            $orders = Order::where('status', 'delivered')
                ->whereBetween('delivered_at', [$windowStart, $windowEnd])
                ->where(function ($q) use ($hours) {
                    // Never sent any reminder at this interval yet
                    $q->whereNull('last_rating_reminder_at')
                      ->orWhereRaw(
                          // last reminder was sent for a shorter interval (allow sending next)
                          'EXTRACT(EPOCH FROM (? - last_rating_reminder_at)) / 3600 > ?',
                          [now(), $hours * 0.5]
                      );
                })
                ->whereDoesntHave('review') // skip if already reviewed
                ->with('buyer')
                ->get();

            foreach ($orders as $order) {
                // Double-check review doesn't exist
                if (Review::where('order_id', $order->id)->exists()) {
                    continue;
                }

                try {
                    $order->buyer->notify(new RatingReminderNotification($order));
                    $order->update(['last_rating_reminder_at' => now()]);
                    $sent++;

                    Log::info("RatingReminder: sent {$hours}h reminder", [
                        'order_id' => $order->id,
                        'buyer_id' => $order->buyer_id,
                    ]);
                } catch (\Throwable $e) {
                    Log::error("RatingReminder: failed for order {$order->id}", [
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        $this->info("Sent {$sent} rating reminder(s).");
        return Command::SUCCESS;
    }
}