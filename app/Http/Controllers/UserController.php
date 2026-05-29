<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * GET /@{username}  — public profile page
     * Fixed: return type is Response (Inertia), not RedirectResponse
     */
    public function show(string $username): Response
    {
        $user = User::where('username', $username)
            ->where('is_active', true)
            ->firstOrFail();

        $videos = $user->videos()
            ->where('status', 'active')
            ->whereNotNull('published_at')
            ->withCount(['likes', 'comments'])
            ->with('user:id,name,username,avatar,is_verified') 
            ->orderByDesc('published_at')
            ->get();

        // Products visible for ALL roles (buyers can sell too in future)
        // Show products only if user is a seller
        $products = $user->isSeller()
            ? $user->products()
                ->where('status', 'active')
                ->where('stock_quantity', '>', 0)
                ->with('seller:id,name,username,avatar')
                ->orderByDesc('orders_count')
                ->get()
            : collect();

        $isFollowing  = Auth::check() && Auth::user()->isFollowing($user);
        $isOwnProfile = Auth::id() === $user->id;

        return Inertia::render('User/Profile', [
            'profileUser'  => array_merge($user->toArray(), [
                // Make sure these are always present even if 0
                'followers_count' => $user->followers_count ?? 0,
                'following_count' => $user->following_count ?? 0,
                'total_sales'     => $user->total_sales     ?? 0,
            ]),
            'videos'       => $videos,
            'products'     => $products,
            'isFollowing'  => $isFollowing,
            'isOwnProfile' => $isOwnProfile,
        ]);
    }

    /**
     * GET /profile  — redirect to own profile page
     */
    public function edit(): RedirectResponse
    {
        return redirect()->route('settings.profile');
    }

    /**
     * GET /api/users/{user}
     */
    public function apiShow(User $user): JsonResponse
    {
        return response()->json([
            'id'              => $user->id,
            'name'            => $user->name,
            'username'        => $user->username,
            'avatar_url'      => $user->avatar_url,
            'bio'             => $user->bio,
            'is_verified'     => $user->is_verified,
            'followers_count' => $user->followers_count ?? 0,
            'following_count' => $user->following_count ?? 0,
            'role'            => $user->role,
        ]);
    }

    /**
     * POST /api/users/{user}/follow  — toggle follow
     */
    public function follow(User $user): JsonResponse
    {
        $me = Auth::user();

        if ($me->id === $user->id) {
            return response()->json(['message' => 'You cannot follow yourself.'], 422);
        }

        $isFollowing = $me->isFollowing($user);

        if ($isFollowing) {
            $me->following()->detach($user->id);
            // Decrement safely (never go below 0)
            $user->decrement('followers_count');
            $me->decrement('following_count');
        } else {
            $me->following()->syncWithoutDetaching([$user->id]);
            $user->increment('followers_count');
            $me->increment('following_count');
        }

        return response()->json([
            'following'       => !$isFollowing,
            'followers_count' => max(0, $user->fresh()->followers_count),
        ]);
    }
}