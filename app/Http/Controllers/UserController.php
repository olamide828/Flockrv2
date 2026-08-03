<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserBlock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function show(string $username): Response
    {
        $user = User::withTrashed()->where('username', $username)->firstOrFail();

    if ($user->trashed() || !$user->is_active) {
        return Inertia::render('Errors/UserGone');
    }
        $authUser = Auth::user();

        $iBlockedThem  = $authUser && UserBlock::where('blocker_id', $authUser->id)->where('blocked_id', $user->id)->exists();
        $theyBlockedMe = $authUser && UserBlock::where('blocker_id', $user->id)->where('blocked_id', $authUser->id)->exists();
        $anyBlock      = $iBlockedThem || $theyBlockedMe;

        $videos = $anyBlock ? collect() : $user->videos()
            ->where('status', 'active')
            ->whereNotNull('published_at')
            ->withCount(['likes', 'comments'])
            ->with('user:id,name,username,avatar,is_verified')
            ->orderByDesc('published_at')
            ->get();

        $products = ($anyBlock || !$user->isSeller()) ? collect() : $user->products()
    ->where('status', 'active')
    ->where('stock_quantity', '>', 0)
    ->with('seller:id,name,username,avatar')
    ->orderByDesc('created_at')
    ->get();

// Stamp is_saved for the viewing user
$authUserId = Auth::id();
if ($authUserId && $products->isNotEmpty()) {
    $savedIds = \DB::table('product_saves')
        ->where('user_id', $authUserId)
        ->whereIn('product_id', $products->pluck('id')->toArray())
        ->pluck('product_id')
        ->flip()
        ->toArray();
    $products->each(fn($p) => $p->is_saved = isset($savedIds[$p->id]));
} else {
    $products->each(fn($p) => $p->is_saved = false);
}

        $isFollowing  = $authUser && !$anyBlock && $authUser->isFollowing($user);
        $isOwnProfile = Auth::id() === $user->id;

        return Inertia::render('User/Profile', [
            'profileUser'   => array_merge($user->toArray(), [
                'followers_count' => $user->followers_count ?? 0,
                'has_active_subscription' => $user->hasActiveSubscription(),
                'verification_type'       => $user->verification_type,
                'badges'          => $user->badges()->get(['badges.key', 'badges.label', 'badges.description', 'badges.image_path']),
                'is_verified'     => $user->isVerified(),
                'following_count' => $user->following_count ?? 0,
                'total_sales'     => $user->total_sales ?? 0,
                'gamification' => $isOwnProfile
    ? ($user->role === 'seller'
        ? app(\App\Services\GamificationService::class)->forSeller($user)
        : app(\App\Services\GamificationService::class)->forBuyer($user))
    : null,
            ]),
            'videos'        => $videos,
            'products'      => $products,
            'isFollowing'   => $isFollowing,
            'isOwnProfile'  => $isOwnProfile,
            'iBlockedThem'  => $iBlockedThem,
            'theyBlockedMe' => $theyBlockedMe,
        ]);
    }

    public function edit(): RedirectResponse
    {
        return redirect()->route('settings.profile');
    }

    public function apiShow(User $user): JsonResponse
    {
        return response()->json([
            'id'              => $user->id,
            'name'            => $user->name,
            'username'        => $user->username,
            'avatar_url'      => $user->avatar_url,
            'bio'             => $user->bio,
            'is_verified'     => $user->is_verified,
            'verification_type' => $user->verification_type,
            'followers_count' => $user->followers_count ?? 0,
            'following_count' => $user->following_count ?? 0,
            'role'            => $user->role,
        ]);
    }

    public function follow(User $user): JsonResponse
    {
        $me = Auth::user();

        if ($me->id === $user->id) {
            return response()->json(['message' => 'You cannot follow yourself.'], 422);
        }

        // Prevent following across a block relationship
        $blocked = UserBlock::where(function ($q) use ($user) {
            $q->where('blocker_id', Auth::id())->where('blocked_id', $user->id);
        })->orWhere(function ($q) use ($user) {
            $q->where('blocker_id', $user->id)->where('blocked_id', Auth::id());
        })->exists();

        if ($blocked) {
            return response()->json(['message' => 'Cannot follow this user.'], 403);
        }

        $isFollowing = $me->isFollowing($user);

        if ($isFollowing) {
            $me->following()->detach($user->id);
            $this->clampedDecrement($me->id, 'following_count');
            $this->clampedDecrement($user->id, 'followers_count');
        } else {
            $me->following()->syncWithoutDetaching([$user->id]);
            try {
                $user->notify(new \App\Notifications\NewFollowerNotification($me));
            } catch (\Throwable) {}
            DB::table('users')->where('id', $me->id)->increment('following_count');
            DB::table('users')->where('id', $user->id)->increment('followers_count');
        }

        return response()->json([
            'following'       => !$isFollowing,
            'followers_count' => max(0, $user->fresh()->followers_count),
        ]);
    }

    public function block(User $user): JsonResponse
    {
        $me = Auth::user();

        if ($me->id === $user->id) {
            return response()->json(['message' => 'Cannot block yourself.'], 422);
        }

        $existing = UserBlock::where('blocker_id', $me->id)
            ->where('blocked_id', $user->id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['blocked' => false, 'message' => 'User unblocked.']);
        }

        // ── BLOCK — remove follows in both directions, fix counts atomically ──
        DB::transaction(function () use ($me, $user) {
            // Check follow directions BEFORE detaching
            $meFollowedThem  = DB::table('follows')
                ->where('follower_id', $me->id)
                ->where('following_id', $user->id)
                ->exists();

            $theyFollowedMe  = DB::table('follows')
                ->where('follower_id', $user->id)
                ->where('following_id', $me->id)
                ->exists();

            // Remove follows from pivot table
            if ($meFollowedThem) {
                DB::table('follows')
                    ->where('follower_id', $me->id)
                    ->where('following_id', $user->id)
                    ->delete();
            }

            if ($theyFollowedMe) {
                DB::table('follows')
                    ->where('follower_id', $user->id)
                    ->where('following_id', $me->id)
                    ->delete();
            }

            // Apply count corrections in one UPDATE per user
            // me: loses "following" if I was following them
            //     loses "follower" if they were following me
            $meFollowingDelta  = $meFollowedThem  ? -1 : 0;
            $meFollowersDelta  = $theyFollowedMe  ? -1 : 0;

            // them: loses "follower" if I was following them
            //       loses "following" if they were following me
            $themFollowersDelta = $meFollowedThem  ? -1 : 0;
            $themFollowingDelta = $theyFollowedMe  ? -1 : 0;

            if ($meFollowingDelta !== 0 || $meFollowersDelta !== 0) {
                DB::statement('
                    UPDATE users SET
                        following_count = GREATEST(following_count + ?, 0),
                        followers_count = GREATEST(followers_count + ?, 0)
                    WHERE id = ?
                ', [$meFollowingDelta, $meFollowersDelta, $me->id]);
            }

            if ($themFollowersDelta !== 0 || $themFollowingDelta !== 0) {
                DB::statement('
                    UPDATE users SET
                        followers_count = GREATEST(followers_count + ?, 0),
                        following_count = GREATEST(following_count + ?, 0)
                    WHERE id = ?
                ', [$themFollowersDelta, $themFollowingDelta, $user->id]);
            }

            // Create the block record
            UserBlock::create([
                'blocker_id' => $me->id,
                'blocked_id' => $user->id,
            ]);
        });

        return response()->json(['blocked' => true, 'message' => 'User blocked.']);
    }

    public function report(Request $request, User $user): JsonResponse
    {
        $me = Auth::user();

        if ($me->id === $user->id) {
            return response()->json(['message' => 'Cannot report yourself.'], 422);
        }

        \App\Models\Report::updateOrCreate(
            ['reporter_id' => $me->id, 'reported_id' => $user->id],
            ['reason' => $request->input('reason', 'Reported by user'), 'status' => 'pending']
        );

        return response()->json(['message' => 'Report submitted. Our team will review it.']);
    }

    public function deleteAccount(Request $request): JsonResponse
{
    $user = Auth::user();

    // ── 1. Check blockers ─────────────────────────────────────────────────
    $pendingBuyerOrders = \App\Models\Order::where('buyer_id', $user->id)
        ->whereIn('status', ['pending', 'paid', 'processing', 'shipped'])
        ->count();

    if ($pendingBuyerOrders > 0) {
        return response()->json([
            'message' => 'You have active orders in progress. Please wait for them to complete before deleting your account.',
            'blocker' => 'pending_orders',
            'count'   => $pendingBuyerOrders,
        ], 422);
    }

    $pendingSellerOrders = \App\Models\Order::where('seller_id', $user->id)
        ->whereIn('status', ['pending', 'paid', 'processing', 'shipped'])
        ->count();

    if ($pendingSellerOrders > 0) {
        return response()->json([
            'message' => 'You have active customer orders to fulfil. Please resolve all orders before deleting your account.',
            'blocker' => 'pending_seller_orders',
            'count'   => $pendingSellerOrders,
        ], 422);
    }

    $pendingPayouts = \DB::table('payouts')
        ->where('seller_id', $user->id)
        ->whereIn('status', ['pending', 'processing'])
        ->count();

    if ($pendingPayouts > 0) {
        return response()->json([
            'message' => 'You have a payout being processed. Please wait for it to complete before deleting your account.',
            'blocker' => 'pending_payouts',
        ], 422);
    }

    $openDisputes = \App\Models\Order::where(function ($q) use ($user) {
            $q->where('buyer_id', $user->id)->orWhere('seller_id', $user->id);
        })
        ->where('status', 'disputed')
        ->count();

    if ($openDisputes > 0) {
        return response()->json([
            'message' => 'You have an open dispute that must be resolved before deleting your account.',
            'blocker' => 'open_disputes',
        ], 422);
    }

    // ── 2. Preserve identity for admin/fraud reference BEFORE anonymising ─
    \DB::transaction(function () use ($user) {
        $user->update([
            // Save original values admin can still search
            'deleted_name'          => $user->name,
            'deleted_email'         => $user->email,
            // Schedule hard deletion in 30 days
            'deletion_scheduled_at' => now()->addDays(30),
            // Anonymise immediately — account becomes unusable
            'is_active'             => false,
            'email'                 => 'deleted_' . $user->id . '_' . time() . '@flockr.deleted',
            'username'              => 'deleted_' . $user->id,
            'name'                  => 'Deleted User',
            'avatar'                => null,
            'bio'                   => null,
            'phone'                 => null,
        ]);

        // Soft-delete all their content immediately
        \App\Models\Video::where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now()]);

        \App\Models\Product::where('seller_id', $user->id)
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now()]);

        // Soft-delete the user
        $user->delete();
    });

    // ── 3. Sign out — Sanctum RequestGuard has no logout() method ────────
    if (method_exists($user, 'tokens')) {
        $user->tokens()->delete();
    }

    if ($request->hasSession()) {
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    return response()->json([
        'message' => 'Your account has been scheduled for deletion and will be permanently removed in 30 days.',
    ]);
}
    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Decrement a counter column but never go below 0.
     * Uses a single DB statement — no in-memory model needed.
     */
    private function clampedDecrement(int $userId, string $column): void
    {
        DB::statement(
            "UPDATE users SET {$column} = GREATEST({$column} - 1, 0) WHERE id = ?",
            [$userId]
        );
    }
}