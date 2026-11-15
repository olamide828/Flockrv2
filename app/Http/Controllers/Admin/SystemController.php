<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/** Admin: system health, failed jobs, audit log. Nothing here touches money. */
class SystemController extends Controller
{
    private function check(string $name, callable $f, bool $critical = true): array
    {
        $t = microtime(true);
        try {
            [$ok, $detail] = $f();
            return ['name' => $name, 'status' => $ok ? 'ok' : ($critical ? 'fail' : 'warn'), 'detail' => $detail, 'ms' => round((microtime(true) - $t) * 1000)];
        } catch (\Throwable $e) {
            return ['name' => $name, 'status' => $critical ? 'fail' : 'warn', 'detail' => mb_substr($e->getMessage(), 0, 160), 'ms' => round((microtime(true) - $t) * 1000)];
        }
    }

    /** GET /api/admin/system/health */
    public function health(): JsonResponse
    {
        $checks = [
            $this->check('Database', fn () => [DB::select('select 1') !== null, config('database.default')]),
            $this->check('Cache', function () {
                Cache::put('admin_health_probe', 1, 10);
                return [Cache::get('admin_health_probe') === 1, config('cache.default')];
            }),
            $this->check('File storage', function () {
                $d = config('filesystems.default');
                Storage::disk($d)->exists('.health-probe');
                return [true, $d];
            }, false),
            $this->check('Queue', function () {
                $conn = config('queue.default');
                $backlog = Schema::hasTable('jobs') && $conn === 'database' ? DB::table('jobs')->count() : null;
                return [$backlog === null || $backlog < 500, $conn . ($backlog !== null ? " · {$backlog} waiting" : '')];
            }),
            $this->check('Failed jobs', function () {
                $n = Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0;
                return [$n === 0, $n . ' failed'];
            }, false),
            $this->check('Scheduler', function () {
                $beat = Cache::get('scheduler:heartbeat');
                if (!$beat) return [false, 'No heartbeat yet — add the heartbeat line to routes/console.php'];
                $age = now()->diffInMinutes(\Carbon\Carbon::parse($beat));
                return [$age <= 5, "last tick {$age} min ago"];
            }, false),
        ];

        $env = [];
        foreach ([
            'PAYSTACK_SECRET_KEY' => config('services.paystack.secret_key') ?? env('PAYSTACK_SECRET_KEY'),
            'TERMINAL_SECRET_KEY' => config('services.terminal.secret_key'),
            'TERMINAL_WEBHOOK_SECRET' => config('services.terminal.webhook_secret') ?? env('TERMINAL_WEBHOOK_SECRET'),
            'GEMINI_API_KEY' => config('services.gemini.key'),
            'APP_DEBUG is off' => !config('app.debug') ? 'yes' : null,
            'APP_URL is https' => str_starts_with((string) config('app.url'), 'https://') ? 'yes' : null,
        ] as $k => $v) {
            $env[] = ['name' => $k, 'ok' => !empty($v)];
        }

        $scheduled = [];
        foreach (['orders:release-escrow', 'orders:expire-pending', 'events:award-champions', 'events:activate-scheduled', 'videos:heal', 'badges:check', 'subscriptions:remind', 'flockr:process-payouts'] as $cmd) {
            $scheduled[] = ['command' => $cmd, 'registered' => array_key_exists($cmd, Artisan::all())];
        }

        return response()->json([
            'checks' => $checks, 'env' => $env, 'scheduled' => $scheduled,
            'app' => ['env' => config('app.env'), 'php' => PHP_VERSION, 'laravel' => app()->version(), 'time' => now()->toIso8601String()],
        ]);
    }

    /** GET /api/admin/system/failed-jobs */
    public function failedJobs(Request $request): JsonResponse
    {
        if (!Schema::hasTable('failed_jobs')) return response()->json(['data' => [], 'total' => 0, 'current_page' => 1, 'last_page' => 1]);
        $p = DB::table('failed_jobs')->orderByDesc('id')->paginate(20);
        $p->getCollection()->transform(function ($j) {
            $payload = json_decode($j->payload, true);
            return [
                'id' => $j->id, 'uuid' => $j->uuid, 'queue' => $j->queue, 'failed_at' => $j->failed_at,
                'job' => class_basename($payload['displayName'] ?? 'Job'),
                'error' => mb_substr(strtok((string) $j->exception, "\n"), 0, 300),
            ];
        });
        return response()->json($p);
    }

    /** POST /api/admin/system/failed-jobs/{uuid}/retry */
    public function retryFailed(string $uuid): JsonResponse
    {
        Artisan::call('queue:retry', ['id' => [$uuid]]);
        Audit::log('system.failed_job.retry', null, ['uuid' => $uuid]);
        return response()->json(['message' => 'Job queued to retry.']);
    }

    /** POST /api/admin/system/failed-jobs/retry-all */
    public function retryAll(): JsonResponse
    {
        Artisan::call('queue:retry', ['id' => ['all']]);
        Audit::log('system.failed_job.retry_all');
        return response()->json(['message' => 'All failed jobs queued to retry.']);
    }

    /** DELETE /api/admin/system/failed-jobs/{uuid} */
    public function forgetFailed(string $uuid): JsonResponse
    {
        Artisan::call('queue:forget', ['id' => $uuid]);
        Audit::log('system.failed_job.forget', null, ['uuid' => $uuid]);
        return response()->json(['message' => 'Failed job removed.']);
    }

    /** GET /api/admin/audit-logs?action=&admin_id=&search= */
    public function audit(Request $request): JsonResponse
    {
        $q = AdminAuditLog::with('admin:id,name,username,avatar')->latest('id');
        if ($request->filled('admin_id')) $q->where('admin_id', $request->admin_id);
        if ($request->filled('action'))   $q->where('action', 'like', $request->action . '%');
        if ($request->filled('target_type')) $q->where('target_type', $request->target_type);
        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $q->where(fn ($w) => $w->where('action', 'ilike', $s)->orWhere('target_id', is_numeric($request->search) ? $request->search : 0));
        }
        $p = $q->paginate(30);
        $actions = AdminAuditLog::select('action')->distinct()->orderBy('action')->pluck('action');
        return response()->json(['rows' => $p, 'actions' => $actions]);
    }
}
