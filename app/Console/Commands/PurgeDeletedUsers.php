<?php

namespace App\Console\Commands;

use App\Services\AccountPurgeService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgeDeletedUsers extends Command
{
    protected $signature = 'users:purge-deleted {--dry : only show what would happen} {--user= : purge one user id now (ignores the date, still respects legal hold)}';
    protected $description = 'Hard-delete personal data of deleted accounts whose retention period is over (never touches accounts on legal hold)';

    public function handle(AccountPurgeService $purger): int
    {
        $q = DB::table('users')->whereNotNull('deleted_at')->whereNull('purged_at');
        if ($id = $this->option('user')) {
            $q->where('id', (int) $id);
        } else {
            $q->whereNotNull('deletion_scheduled_at')->where('deletion_scheduled_at', '<=', now())->where(fn ($w) => $w->whereNull('legal_hold')->orWhere('legal_hold', false));
        }
        $ids = $q->orderBy('id')->pluck('id');
        $this->info($ids->count() . ' account(s) ' . ($this->option('dry') ? 'would be processed' : 'to process'));

        $rows = [];
        foreach ($ids as $uid) {
            try {
                $r = $purger->purge((int) $uid, (bool) $this->option('dry'), (bool) $this->option('user'));
                $rows[] = [$uid, $r['status'], json_encode($r['detail'])];
            } catch (\Throwable $e) {
                $rows[] = [$uid, 'FAILED', $e->getMessage()];
            }
        }
        if ($rows) $this->table(['user', 'result', 'detail'], $rows);
        return collect($rows)->contains(fn ($r) => $r[1] === 'FAILED') ? self::FAILURE : self::SUCCESS;
    }
}
