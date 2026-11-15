<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserBlock;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Admin v2 — who has blocked whom (abuse patterns) and the power to undo a block. */
class BlockAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $t = (new UserBlock)->getTable();
        $q = DB::table($t)
            ->join('users as a', 'a.id', '=', "$t.blocker_id")
            ->join('users as b', 'b.id', '=', "$t.blocked_id")
            ->select("$t.blocker_id", "$t.blocked_id", "$t.created_at",
                'a.name as blocker_name', 'a.username as blocker_username', 'a.avatar as blocker_avatar',
                'b.name as blocked_name', 'b.username as blocked_username', 'b.avatar as blocked_avatar');

        if ($s = trim((string) $request->input('search'))) {
            $like = '%' . $s . '%';
            $q->where(fn ($w) => $w->where('a.username', 'ilike', $like)->orWhere('b.username', 'ilike', $like)->orWhere('a.name', 'ilike', $like)->orWhere('b.name', 'ilike', $like));
        }
        $rows = $q->orderByDesc("$t.created_at")->paginate(30);

        // most-blocked accounts: a quick abuse signal
        $top = DB::table($t)->join('users', 'users.id', '=', "$t.blocked_id")
            ->select('users.id', 'users.name', 'users.username', DB::raw('count(*) as blocks'))
            ->groupBy('users.id', 'users.name', 'users.username')->orderByDesc('blocks')->limit(8)->get();

        return response()->json(['rows' => $rows, 'top' => $top, 'stats' => ['total' => DB::table($t)->count()]]);
    }

    public function destroy($blockerId, $blockedId): JsonResponse
    {
        $n = UserBlock::where('blocker_id', $blockerId)->where('blocked_id', $blockedId)->delete();
        abort_if(!$n, 404, 'Block not found.');
        Audit::log('block.remove', User::withTrashed()->find($blockerId), ['blocked_id' => (int) $blockedId]);
        return response()->json(['message' => 'Block removed.']);
    }
}
