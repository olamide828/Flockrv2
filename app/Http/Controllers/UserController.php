<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function show(string $username): Response
    {
        $user = User::where('username', $username)->firstOrFail();

        $videos = $user->videos()
            ->active()
            ->withCount(['likes', 'comments'])
            ->orderByDesc('published_at')
            ->get();

        $products = $user->isSeller()
            ? $user->products()->active()->inStock()
                ->with('seller:id,name,username,avatar')
                ->orderByDesc('orders_count')
                ->get()
            : collect();

        $isFollowing  = Auth::check() && Auth::user()->isFollowing($user);
        $isOwnProfile = Auth::id() === $user->id;

        return Inertia::render('User/Profile', [
            'profileUser'   => $user,
            'videos'        => $videos,
            'products'      => $products,
            'isFollowing'   => $isFollowing,
            'isOwnProfile'  => $isOwnProfile,
        ]);
    }

    public function edit(): Response
    {
        return redirect()->route('settings.profile');
    }

    public function apiShow(User $user): JsonResponse
    {
        return response()->json($user->only([
            'id','name','username','avatar','bio',
            'is_verified','followers_count','following_count','role',
        ]));
    }

    public function follow(User $user): JsonResponse
    {
        $me = Auth::user();

        if ($me->id === $user->id) {
            return response()->json(['message' => 'You cannot follow yourself.'], 422);
        }

        $following = $me->isFollowing($user);

        if ($following) {
            $me->following()->detach($user->id);
            $user->decrement('followers_count');
            $me->decrement('following_count');
        } else {
            $me->following()->syncWithoutDetaching([$user->id]);
            $user->increment('followers_count');
            $me->increment('following_count');
        }

        return response()->json([
            'following'       => !$following,
            'followers_count' => $user->fresh()->followers_count,
        ]);
    }
}
