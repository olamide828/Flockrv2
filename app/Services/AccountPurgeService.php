<?php

namespace App\Services;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * Phase 2: hard-delete personal data of an account whose grace period is over.
 * Orders, payouts and wallet rows are KEPT (their user columns become NULL by the nullOnDelete foreign keys) and
 * the delivery details on those orders are blanked. If the database still has rows pointing at the user that would
 * be deleted or block the delete, the user row stays as a bare tombstone instead, so kept records are never lost.
 */
class AccountPurgeService
{
    /** Order columns holding someone's contact / address details. Only the ones that exist are touched. */
    private const ORDER_PII = ['shipping_name', 'shipping_phone', 'shipping_street', 'shipping_address', 'delivery_address', 'delivery_phone',
        'buyer_name', 'buyer_phone', 'buyer_email', 'recipient_name', 'recipient_phone', 'street', 'phone', 'address'];

    /** @return array{status:string,detail:array} status: purged | tombstoned | skipped_hold | skipped_purged | dry */
    public function purge(int $userId, bool $dry = false, bool $ignoreSchedule = false): array
    {
        $u = DB::table('users')->where('id', $userId)->first();
        if (!$u || $u->deleted_at === null)  return ['status' => 'skipped_active', 'detail' => []];
        if (!empty($u->purged_at))           return ['status' => 'skipped_purged', 'detail' => []];
        if (!empty($u->legal_hold))          return ['status' => 'skipped_hold', 'detail' => []];
        if (!$ignoreSchedule && $u->deletion_scheduled_at && $u->deletion_scheduled_at > now()) return ['status' => 'skipped_early', 'detail' => []];

        $detail = $this->plan($userId);
        if ($dry) return ['status' => 'dry', 'detail' => $detail];

        $files = [];
        try {
            DB::transaction(function () use ($userId, &$files, &$detail) {
                // media files first (collected, deleted after commit)
                foreach (DB::table('videos')->where('user_id', $userId)->get(['video_url', 'thumbnail_url', 'photos']) as $v) {
                    foreach ([$v->video_url, $v->thumbnail_url] as $p) if ($p) $files[] = $p;
                    $ph = is_string($v->photos) ? json_decode($v->photos, true) : $v->photos;
                    foreach ((array) $ph as $p) if (is_string($p)) $files[] = $p;
                }

                // personal content
                $this->del('video_views', 'user_id', $userId);
                $this->delVideos($userId);
                foreach (['likes', 'comments', 'post_comments', 'post_likes', 'post_poll_votes', 'room_messages', 'room_user', 'video_saves', 'product_saves', 'user_interests',
                          'user_addresses', 'login_histories', 'login_history', 'push_tokens', 'device_tokens', 'conversation_request_dismissals', 'user_blocks'] as $t) {
                    $this->del($t, 'user_id', $userId);
                }
                $this->del('user_blocks', 'blocker_id', $userId);
                $this->del('user_blocks', 'blocked_id', $userId);
                $this->del('posts', 'user_id', $userId);

                // direct messages: kept only where the conversation was ever reported (evidence), otherwise deleted
                $this->purgeDms($userId);

                // retained financial records: blank the contact details on this user's orders
                foreach (['buyer_id', 'seller_id'] as $col) {
                    if (!Schema::hasColumn('orders', $col)) continue;
                    foreach (self::ORDER_PII as $c) {
                        if (!Schema::hasColumn('orders', $c)) continue;
                        try { DB::table('orders')->where($col, $userId)->update([$c => null]); } catch (\Throwable) {}
                    }
                }
            });
        } catch (\Throwable $e) {
            Log::error('Account purge failed', ['user_id' => $userId, 'error' => $e->getMessage()]);
            throw $e;
        }

        foreach (array_unique($files) as $p) {
            if (str_starts_with($p, 'http')) continue;
            try { Storage::disk(config('filesystems.default', 'public'))->delete($p); } catch (\Throwable) {}
        }

        $blocking = $this->blockingReferences($userId);
        if ($blocking) {
            DB::table('users')->where('id', $userId)->update([
                'email' => 'purged_' . $userId . '@flockr.deleted', 'name' => 'Deleted User', 'username' => 'deleted_' . $userId,
                'deleted_name' => null, 'deleted_email' => null, 'deleted_username' => null, 'phone' => null, 'purged_at' => now(),
            ]);
            Audit::log('account.purged', null, ['user_id' => $userId, 'mode' => 'tombstone', 'still_referenced_by' => $blocking]);
            return ['status' => 'tombstoned', 'detail' => $blocking];
        }

        DB::table('users')->where('id', $userId)->delete();   // financial rows keep a NULL owner (nullOnDelete)
        Audit::log('account.purged', null, ['user_id' => $userId, 'mode' => 'deleted']);
        return ['status' => 'purged', 'detail' => $detail];
    }

    /** What a purge would remove (row counts), for --dry and the admin page. */
    public function plan(int $userId): array
    {
        $out = [];
        foreach ([['videos', 'user_id'], ['comments', 'user_id'], ['posts', 'user_id'], ['room_messages', 'user_id'], ['follows', 'follower_id'], ['messages', 'sender_id'],
                  ['orders', 'buyer_id'], ['orders', 'seller_id'], ['payouts', 'seller_id'], ['wallet_transactions', 'user_id']] as [$t, $c]) {
            if (Schema::hasTable($t) && Schema::hasColumn($t, $c)) $out["$t.$c"] = DB::table($t)->where($c, $userId)->count();
        }
        return $out;
    }

    private function del(string $table, string $col, int $id): void
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, $col)) return;
        try {
            DB::transaction(fn () => DB::table($table)->where($col, $id)->delete());   // savepoint: one stubborn table (e.g. replies pointing at a comment) must not abort the rest
        } catch (\Throwable $e) {
            Log::warning("Purge: could not clear {$table}.{$col} for user {$id}: " . $e->getMessage());
        }
    }

    private function delVideos(int $userId): void
    {
        $ids = DB::table('videos')->where('user_id', $userId)->pluck('id');
        if ($ids->isEmpty()) return;
        foreach (['likes', 'comments', 'video_views', 'video_saves', 'video_products', 'feed_events'] as $t) {
            if (Schema::hasTable($t) && Schema::hasColumn($t, 'video_id')) DB::table($t)->whereIn('video_id', $ids)->delete();
        }
        DB::table('videos')->whereIn('id', $ids)->delete();
    }

    private function purgeDms(int $userId): void
    {
        if (!Schema::hasTable('messages') || !Schema::hasTable('conversation_user')) return;
        $convIds = DB::table('conversation_user')->where('user_id', $userId)->pluck('conversation_id');
        $reported = collect();
        if (Schema::hasTable('reports') && Schema::hasColumn('reports', 'context')) {
            foreach (DB::table('reports')->whereNotNull('context')->pluck('context') as $ctx) {
                $c = is_string($ctx) ? json_decode($ctx, true) : (array) $ctx;
                if (!empty($c['conversation_id'])) $reported->push((int) $c['conversation_id']);
            }
        }
        $deletable = $convIds->diff($reported);
        if ($deletable->isNotEmpty()) {
            DB::table('messages')->whereIn('conversation_id', $deletable)->delete();
            DB::table('conversation_user')->whereIn('conversation_id', $deletable)->delete();
            DB::table('conversations')->whereIn('id', $deletable)->delete();
        }
        // reported conversations stay as evidence; the user keeps their row there (tombstone logic covers the foreign key)
    }

    /** Tables that would delete or block deleting this user row. Empty on non-Postgres. */
    private function blockingReferences(int $userId): array
    {
        if (DB::getDriverName() !== 'pgsql') return [];
        try {
            $rows = DB::select("SELECT c.conrelid::regclass::text AS tbl, a.attname AS col, c.confdeltype AS rule
                FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
                WHERE c.contype = 'f' AND c.confrelid = 'users'::regclass");
            $out = [];
            foreach ($rows as $r) {
                if (!in_array($r->rule, ['c', 'a', 'r'], true)) continue;     // set null / set default are fine
                $n = DB::table(trim($r->tbl, '"'))->where($r->col, $userId)->count();
                if ($n > 0) $out[] = "{$r->tbl}.{$r->col} ({$n})";
            }
            return $out;
        } catch (\Throwable $e) {
            Log::warning('Purge FK check failed: ' . $e->getMessage());
            return ['fk-check-failed'];   // be safe: keep a tombstone
        }
    }
}
