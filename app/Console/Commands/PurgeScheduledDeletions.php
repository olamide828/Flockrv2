<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgeScheduledDeletions extends Command
{
    protected $signature   = 'users:purge-deleted';
    protected $description = 'Hard-delete accounts whose 30-day grace period has expired';

    public function handle(): void
{
    $due = User::withTrashed()
        ->whereNotNull('deletion_scheduled_at')
        ->where('deletion_scheduled_at', '<=', now())
        ->get();

    foreach ($due as $user) {
        \DB::transaction(function () use ($user) {
            // Orders, payouts, wallet_transactions — buyer_id/seller_id/user_id
            // will be set to NULL by the DB (nullOnDelete), so we do NOT touch
            // these tables. The financial records are preserved permanently.

            // Hard-delete content
            \App\Models\Video::withTrashed()
                ->where('user_id', $user->id)
                ->forceDelete();

            \App\Models\Product::withTrashed()
                ->where('seller_id', $user->id)
                ->forceDelete();

            // Clean up social graph
            \DB::table('follows')
                ->where('follower_id', $user->id)
                ->orWhere('following_id', $user->id)
                ->delete();

            \DB::table('user_blocks')
                ->where('blocker_id', $user->id)
                ->orWhere('blocked_id', $user->id)
                ->delete();

            \DB::table('product_saves')->where('user_id', $user->id)->delete();
            \DB::table('video_saves')->where('user_id', $user->id)->delete();
            \DB::table('video_likes')->where('user_id', $user->id)->delete();

            // Hard-delete the user row
            $user->forceDelete();
        });

        $this->info("Purged user ID {$user->id} ({$user->deleted_name})");
    }

    $this->info("Purged {$due->count()} account(s).");
}

}