<?php

namespace App\Http\Controllers\Concerns;

use App\Models\UserBlock;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

/**
 * One definition of "who must not see each other": users the viewer blocked + users who blocked the viewer.
 * Uses the SAME cache key as FeedService / CommunityFeedService ("blocked:{id}"), so a block cleared in one place is
 * cleared everywhere (see UserController::block).
 */
trait HidesBlockedUsers
{
    protected function blockedUserIds(): array
    {
        $me = Auth::id();
        if (!$me) return [];

        return Cache::remember("blocked:{$me}", 300, function () use ($me) {
            return UserBlock::where('blocker_id', $me)->pluck('blocked_id')
                ->concat(UserBlock::where('blocked_id', $me)->pluck('blocker_id'))
                ->unique()->values()->toArray();
        });
    }

    /** Banned or deleted (or gone) accounts: nothing of theirs is public. */
    protected function accountUnavailable(?\App\Models\User $u): bool
    {
        return !$u || $u->trashed() || !$u->is_active;
    }

    protected function isBlockedWith(?int $userId): bool
    {
        return $userId && in_array($userId, $this->blockedUserIds(), true);
    }
}
