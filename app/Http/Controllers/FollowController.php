<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FollowController extends Controller
{
    /**
     * GET /@{username}/followers
     */
    public function followers(string $username): Response
    {
        $user = User::where('username', $username)->firstOrFail();

        $followers = $user->followers()
            ->select('users.id','users.name','users.username','users.avatar','users.bio','users.is_verified')
            ->get()
            ->map(fn ($u) => array_merge($u->toArray(), [
                'avatar_url'         => $u->avatar_url,
                'is_followed_by_me'  => Auth::check() && Auth::user()->isFollowing($u),
            ]));

        $following = $user->following()
            ->select('users.id','users.name','users.username','users.avatar','users.bio','users.is_verified')
            ->get()
            ->map(fn ($u) => array_merge($u->toArray(), [
                'avatar_url'        => $u->avatar_url,
                'is_followed_by_me' => Auth::check() && Auth::user()->isFollowing($u),
            ]));

        return Inertia::render('User/FollowList', [
            'profileUser' => $user->only(['id','name','username','followers_count','following_count']),
            'followers'   => $followers,
            'following'   => $following,
            'activeTab'   => 'followers',
        ]);
    }

    /**
     * GET /@{username}/following
     */
    public function following(string $username): Response
    {
        $user = User::where('username', $username)->firstOrFail();

        $followers = $user->followers()
            ->select('users.id','users.name','users.username','users.avatar','users.bio','users.is_verified')
            ->get()
            ->map(fn ($u) => array_merge($u->toArray(), [
                'avatar_url'        => $u->avatar_url,
                'is_followed_by_me' => Auth::check() && Auth::user()->isFollowing($u),
            ]));

        $following = $user->following()
            ->select('users.id','users.name','users.username','users.avatar','users.bio','users.is_verified')
            ->get()
            ->map(fn ($u) => array_merge($u->toArray(), [
                'avatar_url'        => $u->avatar_url,
                'is_followed_by_me' => Auth::check() && Auth::user()->isFollowing($u),
            ]));

        return Inertia::render('User/FollowList', [
            'profileUser' => $user->only(['id','name','username','followers_count','following_count']),
            'followers'   => $followers,
            'following'   => $following,
            'activeTab'   => 'following',
        ]);
    }
}