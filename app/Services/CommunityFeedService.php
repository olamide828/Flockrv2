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
     * How long a "seen" post stays excluded from the algorithmic ranking.
     * Unlike the video feed (which excludes almost permanently, because the
     * pool is huge), a timeline feed uses a short rolling window — a post
     * you scrolled past an hour ago is fair game again later today. This
     * keeps the feed from drying up when the candidate pool is small, while
     * still avoiding "the exact same top 5 posts every refresh" in one
     * sitting.
     */
    const SEEN_WINDOW_HOURS = 6;

    /**
     * Returns ['data' => Collection<Post>, 'current_page' => int, 'last_page' => int]
     *
     * Following list has enough recent content -> reverse-chronological from
     * people you follow (classic feed, no seen-exclusion — chronological
     * feeds intentionally show everything in order).
     *
     * Following list is dry -> algorithmic discovery mode: ranks candidates
     * by recency decay + engagement + seller/follow boosts, with recently
     * -seen posts pushed out of the candidate pool first. If excluding seen
     * posts would leave too few candidates to fill a page, the exclusion is
     * dropped for this request rather than serving an empty/short feed —
     * a full feed beats a "correct but empty" one.
     */
    public function getFeed(?int $userId, ?string $sessionId, int $page = 1, int $perPage = 20): array
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
            ->with(['user:id,name,username,avatar,is_verified,role', 'media'])
            ->when(!empty($blockedIds), fn($q) => $q->whereNotIn('user_id', $blockedIds))
            ->when(!empty($dismissedIds), fn($q) => $q->whereNotIn('id', $dismissedIds));

        if ($followingIds->isNotEmpty()) {
            $followingPostCount = (clone $base)->whereIn('user_id', $followingIds)->count();

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

        return $this->algorithmicFeed($base, $followingIds, $userId, $sessionId, $page, $perPage);
    }

    private function algorithmicFeed($base, Collection $followingIds, ?int $userId, ?string $sessionId, int $page, int $perPage): array
    {
        $poolSize = $perPage * 4;
        $seenIds  = $this->getSeenIds($userId, $sessionId);

        $candidates = $this->fetchCandidates($base, $seenIds, $poolSize);

        // Fallback: if excluding seen posts leaves too few to fill even one
        // page, drop the exclusion for this request. A feed that repeats a
        // couple of posts is better than one that goes blank.
        if ($candidates->count() < max(3, $perPage)) {
            $candidates = $this->fetchCandidates($base, collect(), $poolSize);
        }

        if ($candidates->isEmpty()) {
            return ['data' => collect(), 'current_page' => $page, 'last_page' => 1];
        }

        $now = now();

        $ranked = $candidates->map(function (Post $post) use ($followingIds, $now, $seenIds) {
            $ageHours = max(0, $now->diffInHours($post->created_at));
            $recency  = exp(-0.693 * $ageHours / 36); // 36h half-life

            $engagement      = ($post->likes_count * 1.0)
                + ($post->comments_count * 1.8)
                + (($post->views_count ?? 0) * 0.05);
            $engagementScore = min(1.0, $engagement / 50);

            $sellerBoost = ($post->user?->role === 'seller') ? 0.08 : 0;
            $followBoost = $followingIds->contains($post->user_id) ? 0.25 : 0;
            $novelty     = $seenIds->contains($post->id) ? 0.0 : 0.05;

            $post->_score = ($recency * 0.45) + ($engagementScore * 0.4) + $sellerBoost + $followBoost + $novelty;

            return $post;
        })->sortByDesc('_score')->values();

        $total = $candidates->count();
        $items = $ranked->slice(($page - 1) * $perPage, $perPage)->values();

        $this->markSeen($userId, $sessionId, $items->pluck('id')->toArray());

        return [
            'data'         => $items,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / $perPage)),
        ];
    }

    private function fetchCandidates($base, Collection $excludeIds, int $poolSize): Collection
    {
        return (clone $base)
            ->where('created_at', '>=', now()->subDays(14))
            ->when($excludeIds->isNotEmpty(), fn($q) => $q->whereNotIn('id', $excludeIds))
            ->orderByDesc('created_at')
            ->limit($poolSize * 2)
            ->get();
    }

    // ── Seen tracking ─────────────────────────────────────────────────────────

    private function getSeenIds(?int $userId, ?string $sessionId): Collection
    {
        if (!$userId && !$sessionId) return collect();

        $cacheKey = $userId ? "post_seen:{$userId}" : "post_seen:session:{$sessionId}";

        return Cache::remember($cacheKey, 300, function () use ($userId, $sessionId) {
            return DB::table('post_seen')
                ->when($userId, fn($q) => $q->where('user_id', $userId))
                ->when(!$userId, fn($q) => $q->where('session_id', $sessionId))
                ->where('seen_at', '>=', now()->subHours(self::SEEN_WINDOW_HOURS))
                ->pluck('post_id');
        });
    }

    private function markSeen(?int $userId, ?string $sessionId, array $postIds): void
    {
        if (empty($postIds) || (!$userId && !$sessionId)) return;

        try {
            $rows = array_map(fn($id) => [
                'user_id'    => $userId,
                'session_id' => $sessionId,
                'post_id'    => $id,
                'seen_at'    => now(),
            ], $postIds);

            DB::table('post_seen')->upsert(
                $rows,
                $userId ? ['user_id', 'post_id'] : ['session_id', 'post_id'],
                ['seen_at']
            );
        } catch (\Throwable) {
            // Non-critical — never break the feed response over impression logging.
        }

        $cacheKey = $userId ? "post_seen:{$userId}" : "post_seen:session:{$sessionId}";
        Cache::forget($cacheKey);
    }

    /**
     * Old seen rows outside the rolling window are just dead weight —
     * schedule this in app/Console/Kernel.php:
     *   $schedule->call(fn () => app(CommunityFeedService::class)->pruneSeen())->daily();
     */
    public function pruneSeen(): void
    {
        DB::table('post_seen')
            ->where('seen_at', '<', now()->subHours(self::SEEN_WINDOW_HOURS * 4))
            ->delete();
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