<?php

namespace App\Services;

use App\Models\Video;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FeedService
{
    public function getForYouPage(
        ?int $userId,
        int  $limit  = 10,
        int  $cursor = 0,
    ): Collection {

        $seenIds = $this->getSeenIds($userId);

        $candidates = $this->fetchCandidates($limit * 5, $cursor, $seenIds);

        // Not enough unseen? Relax the filter so videos don't disappear
        if ($candidates->count() < min($limit, 3)) {
            $candidates = $this->fetchCandidates($limit * 5, $cursor, collect());
        }

        if ($candidates->isEmpty()) {
            return collect();
        }

        $maxEngagement = max(1, $candidates->max(
            fn($v) => $v->likes_count + ($v->comments_count * 2) + ($v->saves_count * 3)
        ));

        $sellerCount = [];

        $scored = $candidates->map(function (Video $video) use ($maxEngagement, $seenIds, &$sellerCount) {
            $raw        = $video->likes_count + ($video->comments_count * 2) + ($video->saves_count * 3);
            $engagement = $raw / $maxEngagement;
            $ageHours   = max(0, now()->diffInHours($video->published_at));
            $recency    = exp(-0.693 * $ageHours / 48);
            $sellerCount[$video->user_id] = ($sellerCount[$video->user_id] ?? 0) + 1;
            $diversity  = 1.0 / $sellerCount[$video->user_id];
            $novelty    = $seenIds->contains($video->id) ? 0.0 : 1.0;

            $score = ($engagement * 0.35)
                   + ($recency    * 0.30)
                   + ($diversity  * 0.20)
                   + ($novelty    * 0.15);

            return ['video' => $video, 'score' => $score];
        });

        $ranked   = $scored->sortByDesc('score');
        $topCount = (int) ceil($limit * 0.7);
        $top      = $ranked->take($topCount)->pluck('video');
        $rest     = $ranked->slice($topCount)->shuffle()->take($limit - $topCount)->pluck('video');
        $selected = $top->concat($rest)->values();

        // Guests: shuffle so feed feels different on every visit
        if (!$userId) {
            $selected = $selected->shuffle()->values();
        }

        // FIX: Don't mark as seen on feed load — only mark seen when user
        // actually watches (tracked via /api/videos/{video}/view endpoint).
        // This prevents videos from disappearing when navigating back to feed.

        return $selected;
    }

    public function getFollowingFeed(?int $userId, int $cursor = 0, int $limit = 10): Collection
    {
        if (!$userId) return collect();

        $followingIds = DB::table('follows')
            ->where('follower_id', $userId)
            ->pluck('following_id');

        if ($followingIds->isEmpty()) return collect();

        return Video::active()
            ->with([
                'user:id,name,username,avatar,is_verified,location',
                'products' => fn($q) => $q->where('status', 'active'),
            ])
            ->withCount(['likes', 'comments'])
            ->whereIn('user_id', $followingIds)
            ->when($cursor > 0, fn($q) => $q->where('id', '<', $cursor))
            ->orderByDesc('published_at')
            ->limit($limit)
            ->get();
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function fetchCandidates(int $limit, int $cursor, Collection $excludeIds): Collection
    {
        $half = (int) ($limit / 2);

        $base = Video::active()
            ->with([
                'user:id,name,username,avatar,is_verified,location',
                'products' => fn($q) => $q->where('status', 'active'),
            ])
            ->withCount(['likes', 'comments']) // only real relationships
            ->when($excludeIds->isNotEmpty(), fn($q) => $q->whereNotIn('id', $excludeIds))
            ->when($cursor > 0, fn($q) => $q->where('id', '<', $cursor));

        $newest  = (clone $base)->orderByDesc('published_at')->limit($half)->get();
        $engaged = (clone $base)->orderByDesc('views_count')->limit($half)->get();

        return $newest->concat($engaged)->unique('id')->values();
    }

    /**
     * Get IDs of videos the user has actually watched (10+ seconds).
     * Uses video_views table — no separate seen table needed.
     */
    private function getSeenIds(?int $userId): Collection
    {
        if (!$userId) return collect();

        return Cache::remember("feed_seen:{$userId}", 300, function () use ($userId) {
            return DB::table('video_views')
                ->where('user_id', $userId)
                ->where('watch_seconds', '>=', 10)
                ->pluck('video_id')
                ->unique();
        });
    }

    /**
     * Call this when user explicitly clicks "Watch again" / "Refresh feed".
     * Busts the seen cache so the feed recalculates.
     */
    public function resetSeenVideos(int $userId): void
    {
        Cache::forget("feed_seen:{$userId}");
    }
}