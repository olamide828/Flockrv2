<?php

namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;

class ReleaseEscrowPayments extends Command
{
    protected $signature = 'orders:release-escrow';
    protected $description = 'Release wallet credit for delivered orders past the 3-day escrow window';

    public function handle(): void
    {
        $cutoff = now()->subDays(3);

        $orders = Order::where('status', 'delivered')
            ->whereNotNull('delivered_at')
            ->where('delivered_at', '<=', $cutoff)
            ->whereNull('escrow_released_at')
            ->get();

        foreach ($orders as $order) {
            $order->releaseEscrow('Auto-released after 3-day window');
            $this->info("Released escrow for order {$order->reference}");
        }

        $this->info("Done. Released {$orders->count()} order(s).");
    }
}