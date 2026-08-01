<?php
namespace App\Console\Commands;

use App\Models\Subscription;
use Illuminate\Console\Command;

class ExpireSubscriptions extends Command
{
    protected $signature = 'subscriptions:expire';
    protected $description = 'Mark subscriptions past their expiry date as expired';

    public function handle(): void
    {
        $count = Subscription::where('status', 'active')->where('expires_at', '<=', now())->update(['status' => 'expired']);
        $this->info("Expired {$count} subscriptions.");
    }
}