<?php

namespace App\Services;

use App\Models\Post;
use App\Models\UserBlock;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CommunityFeedService
{
    /**
     * Returns ['data' => Collection<Post>, 'current_page' => int, 'last_page' => int]
     *
     * Following list has enough recent content -> reverse-chronological from
     * people you follow (classic feed).
     *
     * Following list is empty/dry -> algorithmic discovery mode: ranks by a
     * blend of recency decay + engagement velocity, with a small boost for
     * sellers/rooms and for people you already follow if they do show up.
     */
    public function getFeed(?int $userId, int $page = 1, int $perPage = 20): array
    {
        $followingIds = $userId
            ? Cache::remember(
                "following:{$userId}",
                120,
                fn() => DB::table('follows')->where('follower_id', $userId)->pluck('following_id')
            )
            : collect();

        $blockedIds   = $userId ? $this->blockedIds($userId) : [];
        $dismissedIds = $userId
            ? DB::table('post_dismissals')->where('user_id', $userId)->pluck('post_id')->toArray()
            : [];

        $base = Post::whereNull('room_id')
            ->with('user:id,name,username,avatar,is_verified,role')
            ->when(!empty($blockedIds), fn($q) => $q->whereNotIn('user_id', $blockedIds))
            ->when(!empty($dismissedIds), fn($q) => $q->whereNotIn('id', $dismissedIds));

        if ($followingIds->isNotEmpty()) {
            $followingPostCount = (clone $base)->whereIn('user_id', $followingIds)->count();

            // Enough content from people you follow to fill this page -> straight chronological.
            if ($followingPostCount >= $perPage) {
                $paginated = (clone $base)->whereIn('user_id', $followingIds)
                    ->latest()
                    ->paginate($perPage, ['*'], 'page', $page);

                return [
                    'data'         => $paginated->getCollection(),
                    'current_page' => $paginated->currentPage(),
                    'last_page'    => $paginated->lastPage(),
                ];
            }
        }

        return $this->algorithmicFeed($base, $followingIds, $page, $perPage);
    }

    private function algorithmicFeed($base, Collection $followingIds, int $page, int $perPage): array
    {
        $poolSize = $perPage * 4;

        $candidates = (clone $base)
            ->where('created_at', '>=', now()->subDays(14))
            ->orderByDesc('created_at')
            ->limit($poolSize * 2)
            ->get();

        $now = now();

        $ranked = $candidates->map(function (Post $post) use ($followingIds, $now) {
            $ageHours = max(0, $now->diffInHours($post->created_at));
            $recency  = exp(-0.693 * $ageHours / 36); // 36h half-life

            $engagement      = ($post->likes_count * 1.0)
                + ($post->comments_count * 1.8)
                + (($post->views_count ?? 0) * 0.05);
            $engagementScore = min(1.0, $engagement / 50);

            $sellerBoost = ($post->user?->role === 'seller') ? 0.08 : 0;
            $followBoost = $followingIds->contains($post->user_id) ? 0.25 : 0;

            $post->_score = ($recency * 0.45) + ($engagementScore * 0.4) + $sellerBoost + $followBoost;

            return $post;
        })->sortByDesc('_score')->values();

        $total = $candidates->count();
        $items = $ranked->slice(($page - 1) * $perPage, $perPage)->values();

        return [
            'data'         => $items,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / $perPage)),
        ];
    }

    private function blockedIds(int $userId): array
    {
        return Cache::remember("blocked:{$userId}", 300, function () use ($userId) {
            $iBlocked  = UserBlock::where('blocker_id', $userId)->pluck('blocked_id');
            $blockedMe = UserBlock::where('blocked_id', $userId)->pluck('blocker_id');
            return $iBlocked->concat($blockedMe)->unique()->toArray();
        });
    }
}