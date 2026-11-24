<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class MentionController extends Controller
{
    use \App\Http\Controllers\Concerns\HidesBlockedUsers;

    /** GET /api/mentions/search?q=  — people you follow first, then everyone else; never blocked or inactive accounts */
    public function search(Request $request): JsonResponse
    {
        $q = ltrim(trim((string) $request->query('q', '')), '@');
        $me = Auth::id();
        $following = DB::table('follows')->where('follower_id', $me)->pluck('following_id')->all();

        $users = User::query()
            ->where('is_active', true)->where('id', '!=', $me)
            ->whereNotIn('id', $this->blockedUserIds())
            ->when($q !== '', fn ($w) => $w->where(fn ($x) => $x->where('username', 'ilike', "{$q}%")->orWhere('name', 'ilike', "{$q}%")),
                   fn ($w) => $w->whereIn('id', $following ?: [0]))
            ->select('id', 'name', 'username', 'avatar', 'is_verified')
            ->limit(30)->get()
            ->sortBy(fn ($u) => in_array($u->id, $following) ? 0 : 1)->values()->take(8)
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'username' => $u->username, 'avatar_url' => $u->avatar_url, 'is_verified' => (bool) $u->is_verified]);

        return response()->json($users);
    }
}
