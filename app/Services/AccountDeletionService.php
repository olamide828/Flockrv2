<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * Phase 1 of account deletion (the moment the user asks): the account becomes unusable and invisible,
 * personal details nobody needs are wiped, and a purge date is set. Phase 2 is AccountPurgeService.
 * Uses the query builder on purpose: it ignores $fillable and the name/username change limits.
 */
class AccountDeletionService
{
    /** Order states that mean money or goods are still moving. */
    public const ACTIVE_ORDER_STATES = ['pending', 'paid', 'confirmed', 'processing', 'shipped', 'pickup_failed'];

    /** @return array{message:string,blocker:string,count?:int}|null first reason the account cannot be deleted yet */
    public function blocker(User $user): ?array
    {
        $buying = \App\Models\Order::where('buyer_id', $user->id)->whereIn('status', self::ACTIVE_ORDER_STATES)->count();
        if ($buying > 0) {
            return ['message' => 'You have active orders in progress. Please wait for them to complete before deleting your account.', 'blocker' => 'pending_orders', 'count' => $buying];
        }
        $selling = \App\Models\Order::where('seller_id', $user->id)->whereIn('status', self::ACTIVE_ORDER_STATES)->count();
        if ($selling > 0) {
            return ['message' => 'You have active customer orders to fulfil. Please resolve all orders before deleting your account.', 'blocker' => 'pending_seller_orders', 'count' => $selling];
        }
        if (DB::table('payouts')->where('seller_id', $user->id)->whereIn('status', ['pending', 'processing'])->exists()) {
            return ['message' => 'You have a payout being processed. Please wait for it to complete before deleting your account.', 'blocker' => 'pending_payouts'];
        }
        $disputed = \App\Models\Order::where(fn ($q) => $q->where('buyer_id', $user->id)->orWhere('seller_id', $user->id))->where('status', 'disputed')->exists();
        if ($disputed) {
            return ['message' => 'You have an open dispute that must be resolved before deleting your account.', 'blocker' => 'open_disputes'];
        }
        try {
            if (app(WalletService::class)->balance($user->id) > 0) {
                return ['message' => 'You still have money in your wallet. Withdraw it before deleting your account.', 'blocker' => 'wallet_balance'];
            }
        } catch (\Throwable) {}
        return null;
    }

    public function delete(User $user): void
    {
        $id   = $user->id;
        $now  = now();
        $days = (int) config('flockr_privacy.deletion_retention_days', 30);
        $avatar = $user->avatar;
        $cover  = $user->cover_image ?? null;

        DB::transaction(function () use ($user, $id, $now, $days) {
            // 1. identity: keep the originals in deleted_* so admin / authorities can still find the account
            $set = [
                'deleted_name'          => $user->name,
                'deleted_email'         => $user->email,
                'deleted_username'      => $user->username,
                'deletion_requested_at' => $now,
                'deletion_scheduled_at' => $now->copy()->addDays($days),
                'is_active'             => false,
                'email'                 => 'deleted_' . $id . '_' . time() . '@flockr.deleted',
                'username'              => 'deleted_' . $id,
                'name'                  => 'Deleted User',
                // personal details nobody needs any more
                'avatar' => null, 'cover_image' => null, 'bio' => null, 'phone' => null, 'location' => null, 'preferences' => null,
                // payment details: wiped now (money records stay on orders/payouts/wallet)
                'bank_name' => null, 'bank_code' => null, 'account_name' => null, 'account_last4' => null, 'account_number' => null,
                'paystack_recipient_code' => null, 'paystack_subaccount_code' => null,
                'pickup_street' => null, 'pickup_city' => null, 'pickup_state' => null, 'pickup_state_code' => null, 'pickup_postal_code' => null,
                'followers_count' => 0, 'following_count' => 0,
                'remember_token' => null,
            ];
            $cols = Schema::getColumnListing('users');
            DB::table('users')->where('id', $id)->update(array_intersect_key($set, array_flip($cols)));

            // 2. follows both ways, and fix the other people's counters
            if (Schema::hasTable('follows')) {
                $iFollowed = DB::table('follows')->where('follower_id', $id)->pluck('following_id');
                $followedMe = DB::table('follows')->where('following_id', $id)->pluck('follower_id');
                DB::table('follows')->where('follower_id', $id)->orWhere('following_id', $id)->delete();
                if ($iFollowed->isNotEmpty())  DB::table('users')->whereIn('id', $iFollowed)->update(['followers_count' => DB::raw('GREATEST(followers_count - 1, 0)')]);
                if ($followedMe->isNotEmpty()) DB::table('users')->whereIn('id', $followedMe)->update(['following_count' => DB::raw('GREATEST(following_count - 1, 0)')]);
            }

            // 3. their content disappears from every feed (soft delete; restorable until the purge)
            DB::table('videos')->where('user_id', $id)->whereNull('deleted_at')->update(['deleted_at' => $now]);
            DB::table('products')->where('seller_id', $id)->whereNull('deleted_at')->update(['deleted_at' => $now]);
            if (Schema::hasTable('posts') && Schema::hasColumn('posts', 'deleted_at')) {
                DB::table('posts')->where('user_id', $id)->whereNull('deleted_at')->update(['deleted_at' => $now]);
            }
            if (Schema::hasTable('rooms') && Schema::hasColumn('rooms', 'closed_at')) {
                DB::table('rooms')->where('seller_id', $id)->whereNull('closed_at')->update(['closed_at' => $now]);
            }

            // 4. sign them out everywhere
            if (Schema::hasTable('personal_access_tokens')) {
                DB::table('personal_access_tokens')->where('tokenable_id', $id)->where('tokenable_type', User::class)->delete();
            }
            if (Schema::hasTable('sessions')) DB::table('sessions')->where('user_id', $id)->delete();

            // 5. small personal lists
            foreach (['product_saves', 'video_saves', 'push_tokens', 'device_tokens', 'conversation_request_dismissals'] as $t) {
                if (Schema::hasTable($t) && Schema::hasColumn($t, 'user_id')) DB::table($t)->where('user_id', $id)->delete();
            }
            if (Schema::hasTable('notifications')) {
                DB::table('notifications')->where('notifiable_id', $id)->where('notifiable_type', User::class)->delete();
            }
        });

        // files last (a storage hiccup must not undo the deletion)
        foreach ([$avatar, $cover] as $path) {
            if (!$path || str_starts_with((string) $path, 'http')) continue;
            try { Storage::disk(config('filesystems.default', 'public'))->delete($path); } catch (\Throwable) {}
        }

        // soft-delete the user row itself
        $user->refresh();
        $user->delete();
    }
}
