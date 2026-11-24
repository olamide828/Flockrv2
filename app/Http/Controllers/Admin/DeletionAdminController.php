<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AccountPurgeService;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/** Admin → Account deletions: who is waiting to be purged, legal hold, restore, purge now. */
class DeletionAdminController extends Controller
{
    /** GET /api/admin/deletions?search=&status=pending|due|held|purged */
    public function index(Request $request): JsonResponse
    {
        $base = DB::table('users')->whereNotNull('deleted_at');
        $q = clone $base;
        if ($s = trim((string) $request->input('search'))) {
            $q->where(fn ($w) => $w->where('deleted_name', 'ilike', "%{$s}%")->orWhere('deleted_email', 'ilike', "%{$s}%")
                ->orWhere('deleted_username', 'ilike', "%{$s}%")->orWhere('id', ctype_digit($s) ? (int) $s : 0));
        }
        match ($request->input('status')) {
            'pending' => $q->whereNull('purged_at')->where(fn ($w) => $w->whereNull('legal_hold')->orWhere('legal_hold', false))->where('deletion_scheduled_at', '>', now()),
            'due'     => $q->whereNull('purged_at')->where(fn ($w) => $w->whereNull('legal_hold')->orWhere('legal_hold', false))->where('deletion_scheduled_at', '<=', now()),
            'held'    => $q->where('legal_hold', true)->whereNull('purged_at'),
            'purged'  => $q->whereNotNull('purged_at'),
            default   => null,
        };

        $rows = $q->orderByDesc('deleted_at')->paginate(20)->through(function ($u) {
            $sched = $u->deletion_scheduled_at ? \Carbon\Carbon::parse($u->deletion_scheduled_at) : null;
            return [
                'id' => $u->id, 'name' => $u->deleted_name, 'email' => $u->deleted_email, 'username' => $u->deleted_username, 'role' => $u->role,
                'requested_at' => $u->deletion_requested_at ?? $u->deleted_at, 'scheduled_at' => $u->deletion_scheduled_at,
                'days_left' => $sched ? (int) ceil(now()->diffInHours($sched, false) / 24) : null,
                'legal_hold' => (bool) ($u->legal_hold ?? false), 'legal_hold_reason' => $u->legal_hold_reason ?? null,
                'purged_at' => $u->purged_at ?? null,
            ];
        });

        $live = fn () => (clone $base)->whereNull('purged_at');
        return response()->json([
            'rows' => $rows,
            'stats' => [
                'waiting' => $live()->count(),
                'due'     => $live()->where(fn ($w) => $w->whereNull('legal_hold')->orWhere('legal_hold', false))->where('deletion_scheduled_at', '<=', now())->count(),
                'held'    => (clone $base)->where('legal_hold', true)->whereNull('purged_at')->count(),
                'purged'  => (clone $base)->whereNotNull('purged_at')->count(),
            ],
        ]);
    }

    public function hold(Request $request, int $id): JsonResponse
    {
        $d = $request->validate(['reason' => 'required|string|max:500']);
        $u = $this->pending($id);
        DB::table('users')->where('id', $id)->update(['legal_hold' => true, 'legal_hold_reason' => $d['reason'], 'legal_hold_at' => now(), 'legal_hold_by' => Auth::id()]);
        Audit::log('account.legal_hold', User::withTrashed()->find($id), ['reason' => $d['reason']]);
        return response()->json(['message' => 'Legal hold placed. This account will not be purged.']);
    }

    public function release(Request $request, int $id): JsonResponse
    {
        $this->pending($id);
        DB::table('users')->where('id', $id)->update(['legal_hold' => false, 'legal_hold_reason' => null, 'legal_hold_at' => null, 'legal_hold_by' => null]);
        Audit::log('account.legal_hold_released', User::withTrashed()->find($id), ['reason' => $request->input('reason')]);
        return response()->json(['message' => 'Hold released. The account purges on its scheduled date.']);
    }

    /** Bring the account back before it is purged. Bank details and follows are gone for good; the user signs in with "Forgot password". */
    public function restore(Request $request, int $id): JsonResponse
    {
        $d = $request->validate(['username' => 'nullable|string|max:15|regex:/^[a-z0-9_.]+$/', 'reason' => 'nullable|string|max:500']);
        $u = $this->pending($id);
        if (!$u->deleted_email || !$u->deleted_name) return response()->json(['message' => 'This account has no saved original details to restore.'], 422);

        $emailTaken = DB::table('users')->where('email', $u->deleted_email)->where('id', '!=', $id)->whereNull('deleted_at')->exists();
        if ($emailTaken) return response()->json(['message' => 'Someone registered with this email after the deletion, so it cannot be restored.'], 422);

        $want = $d['username'] ?? $u->deleted_username ?? null;
        $taken = fn ($name) => !$name || DB::table('users')->where('username', $name)->where('id', '!=', $id)->exists();
        if ($taken($want)) {
            if (!empty($d['username'])) return response()->json(['message' => 'That username is taken. Choose another.'], 422);
            do { $want = Str::limit(Str::slug($u->deleted_name, ''), 9, '') . random_int(1000, 99999); } while ($taken($want));
        }

        $since = \Carbon\Carbon::parse($u->deletion_requested_at ?? $u->deleted_at)->subMinutes(5);
        DB::transaction(function () use ($id, $u, $want, $since) {
            DB::table('users')->where('id', $id)->update([
                'name' => $u->deleted_name, 'email' => $u->deleted_email, 'username' => $want, 'is_active' => true,
                'deleted_at' => null, 'deletion_scheduled_at' => null, 'deletion_requested_at' => null,
                'deleted_name' => null, 'deleted_email' => null, 'deleted_username' => null,
            ]);
            // only content that the deletion itself hid
            DB::table('videos')->where('user_id', $id)->where('deleted_at', '>=', $since)->update(['deleted_at' => null]);
            DB::table('products')->where('seller_id', $id)->where('deleted_at', '>=', $since)->update(['deleted_at' => null]);
            if (Schema::hasTable('posts') && Schema::hasColumn('posts', 'deleted_at')) DB::table('posts')->where('user_id', $id)->where('deleted_at', '>=', $since)->update(['deleted_at' => null]);
            if (Schema::hasTable('rooms') && Schema::hasColumn('rooms', 'closed_at')) DB::table('rooms')->where('seller_id', $id)->where('closed_at', '>=', $since)->update(['closed_at' => null]);
        });
        Audit::log('account.restored', User::find($id), ['reason' => $d['reason'] ?? null, 'username' => $want]);
        return response()->json(['message' => "Account restored as @{$want}. Ask them to use “Forgot password” to sign in."]);
    }

    public function purge(Request $request, int $id): JsonResponse
    {
        $d = $request->validate(['reason' => 'required|string|max:500']);
        $u = $this->pending($id);
        if (!empty($u->legal_hold)) return response()->json(['message' => 'This account is on legal hold. Release the hold first.'], 422);
        $r = app(AccountPurgeService::class)->purge($id, false, true);
        Audit::log('account.purge_now', null, ['user_id' => $id, 'reason' => $d['reason'], 'result' => $r['status']]);
        return response()->json(['message' => $r['status'] === 'tombstoned' ? 'Personal data removed. A bare record stays because kept records still reference it.' : 'Account purged.']);
    }

    private function pending(int $id): object
    {
        $u = DB::table('users')->where('id', $id)->whereNotNull('deleted_at')->first();
        abort_unless($u, 404, 'Deleted account not found.');
        abort_if(!empty($u->purged_at), 422, 'This account was already purged.');
        return $u;
    }
}
