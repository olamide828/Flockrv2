<?php

namespace App\Console\Commands;

use App\Models\Coupon;
use App\Models\Order;
use Illuminate\Console\Command;

class ExpirePendingOrders extends Command
{
    protected $signature = 'orders:expire-pending';
    protected $description = 'Cancel pending orders abandoned for over 24 hours and release their reserved coupons';

    public function handle(): void
    {
        $cutoff = now()->subHours(24);

        $orders = Order::where('status', 'pending')
            ->where('created_at', '<=', $cutoff)
            ->get();

        foreach ($orders as $order) {
            $order->update([
                'status'              => 'cancelled',
                'cancellation_reason' => 'Payment never completed — expired after 24 hours',
            ]);

            Coupon::where('used_on_order_id', $order->id)
                ->whereNull('used_at')
                ->update(['used_on_order_id' => null]);
        }

        $this->info("Expired {$orders->count()} abandoned order(s).");
    }
}