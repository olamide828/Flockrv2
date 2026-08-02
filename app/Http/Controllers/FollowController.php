<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FollowController extends Controller
{
    const FOLLOWING_CAP = 50;
    const FOLLOWERS_CAP = 100;

    public function followers(string $username): Response
    {
        return $this->render($username, 'followers');
    }

    public function following(string $username): Response
    {
        return $this->render($username, 'following');
    }

    private function render(string $username, string $activeTab): Response
    {
        $user    = User::where('username', $username)->firstOrFail();
        $isOwner = Auth::id() === $user->id;

        $followers = $this->getList($user->followers(), $isOwner ? null : self::FOLLOWERS_CAP);
        $following = $this->getList($user->following(), $isOwner ? null : self::FOLLOWING_CAP);

        return Inertia::render('User/FollowList', [
            'profileUser' => array_merge(
                $user->only(['id', 'name', 'username', 'followers_count', 'following_count']),
                ['is_owner' => $isOwner]
            ),
            'followers'       => $followers,
            'following'       => $following,
            'activeTab'       => $activeTab,
            'followersCapped' => !$isOwner && $user->followers_count > self::FOLLOWERS_CAP,
            'followingCapped' => !$isOwner && $user->following_count > self::FOLLOWING_CAP,
        ]);
    }

    /**
     * GET /api/users/{username}/follow-list/search
     * Always searches the FULL followers/following table, regardless of
     * whether the viewer is capped in the default (non-search) view above.
     */
    public function search(Request $request, string $username): JsonResponse
    {
        $validated = $request->validate([
            'tab' => 'required|in:followers,following',
            'q'   => 'required|string|min:1|max:50',
        ]);

        $user = User::where('username', $username)->firstOrFail();

        $relationQuery = $validated['tab'] === 'followers' ? $user->followers() : $user->following();

        $q = $validated['q'];

        $results = $relationQuery
            ->select('users.id', 'users.name', 'users.username', 'users.avatar', 'users.bio', 'users.is_verified')
            ->where(function ($qb) use ($q) {
                $qb->where('users.name', 'ilike', "%{$q}%")
                   ->orWhere('users.username', 'ilike', "%{$q}%");
            })
            ->limit(30)
            ->get()
            ->map(fn ($u) => array_merge($u->toArray(), [
                'avatar_url'         => $u->avatar_url,
                'is_followed_by_me'  => Auth::check() && Auth::user()->isFollowing($u),
            ]));

        return response()->json($results);
    }

    private function getList($relationQuery, ?int $cap)
    {
        $query = $relationQuery->select('users.id', 'users.name', 'users.username', 'users.avatar', 'users.bio', 'users.is_verified');

        if ($cap) {
            $query->limit($cap);
        }

        return $query->get()->map(fn ($u) => array_merge($u->toArray(), [
            'avatar_url'         => $u->avatar_url,
            'is_followed_by_me'  => Auth::check() && Auth::user()->isFollowing($u),
        ]));
    }
}