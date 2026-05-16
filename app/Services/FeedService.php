<?php

namespace App\Services;

use App\Models\Video;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FeedService
{
    /**
     * "For You" page — TikTok-style algorithm.
     *
     * NO external dependencies (no getInterests(), no pgvector required).
     * Works perfectly in local dev with 3 videos.
     *
     * Scoring formula per video:
     *   score = engagement(0.35) + recency(0.30) + diversity(0.20) + novelty(0.15)
     *
     * - engagement : (likes + comments*2 + saves*3 + views*0.1) normalised 0-1
     * - recency    : exponential decay with 48h half-life (newer = higher score)
     * - diversity  : penalty if same seller appears multiple times in this batch
     * - novelty    : videos NOT seen in last 7 days get a bonus
     *
     * After scoring, results are split 70/30:
     *   70% top-scored  → reliable quality content
     *   30% random pick → serendipity / discovery (avoids echo chamber)
     */
    public function getForYouPage(
        ?int $userId,
        int $limit = 10,
        int $cursor = 0,
    ): Collection {

        // IDs the user watched in the last 7 days — avoid immediate repeats
        $recentlySeen = $this->getRecentlySeenIds($userId);

        // ── Fetch candidate pool ──────────────────────────────────────────────
        // Fetch 5× more than needed so scoring has enough to choose from
        $poolSize = max(50, $limit * 5);
        $candidates = $this->fetchCandidates($poolSize, $cursor, $recentlySeen);

        // If pool is smaller than limit (e.g. only 3 videos total), don't filter seen
        // — just show everything, cycling through
        if ($candidates->count() < $limit) {
            $candidates = $this->fetchCandidates($poolSize, $cursor, collect());
        }

        // Still nothing → return empty
        if ($candidates->isEmpty()) {
            return collect();
        }

        // ── Score ─────────────────────────────────────────────────────────────
        $maxEngagement = max(
            1,
            $candidates->max(
                fn($v) =>
                $v->likes_count + ($v->comments_count * 2) + ($v->saves_count * 3) + ($v->views_count * 0.1)
            )
        );

        $sellerCount = [];

        $scored = $candidates->map(function (Video $video) use ($maxEngagement, $recentlySeen, &$sellerCount) {

            // 1. Engagement score
            $raw = $video->likes_count
                + ($video->comments_count * 2)
                + ($video->saves_count * 3)
                + ($video->views_count * 0.1);
            $engagement = $raw / $maxEngagement;

            // 2. Recency score — half-life 48 hours
            $ageHours = max(0, now()->diffInHours($video->published_at));
            $recency = exp(-0.693 * $ageHours / 48);

            // 3. Diversity — penalise seeing same seller repeatedly in one batch
            $sellerCount[$video->user_id] = ($sellerCount[$video->user_id] ?? 0) + 1;
            $diversity = 1.0 / $sellerCount[$video->user_id];

            // 4. Novelty — boost videos not recently seen
            $novelty = $recentlySeen->contains($video->id) ? 0.0 : 1.0;

            $score = ($engagement * 0.35)
                + ($recency * 0.30)
                + ($diversity * 0.20)
                + ($novelty * 0.15);

            return ['video' => $video, 'score' => $score];
        });

        // ── Split: 70% best scored, 30% discovery ─────────────────────────────
        $ranked = $scored->sortByDesc('score');
        $topCount = (int) ceil($limit * 0.7);
        $restCount = $limit - $topCount;

        $top = $ranked->take($topCount)->pluck('video');
        $rest = $ranked->slice($topCount)->shuffle()->take($restCount)->pluck('video');

        $selected = $top->concat($rest)->values();

        // ── Record as seen ────────────────────────────────────────────────────
        if ($userId && $selected->isNotEmpty()) {
            $this->markAsSeen($userId, $selected->pluck('id'));
        }

        return $selected;
    }

    /**
     * Following feed — pure chronological, no algorithm.
     */
    public function getFollowingFeed(?int $userId, int $cursor = 0, int $limit = 10): Collection
    {
        if (!$userId)
            return collect();

        $followingIds = DB::table('follows')
            ->where('follower_id', $userId)
            ->pluck('following_id');

        if ($followingIds->isEmpty())
            return collect();

        return Video::active()
            ->with(['user:id,name,username,avatar,is_verified,location', 'products'])
            ->withCount(['likes', 'comments'])
            ->whereIn('user_id', $followingIds)
            ->when($cursor > 0, fn($q) => $q->where('id', '<', $cursor))
            ->orderByDesc('published_at')
            ->limit($limit)
            ->get();
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Fetch active videos excluding recently seen ones.
     * Mix of newest + most engaged for a diverse candidate pool.
     */
    private function fetchCandidates(int $limit, int $cursor, Collection $excludeIds): Collection
    {
        $q = Video::active()
            ->with(['user:id,name,username,avatar,is_verified,location', 'products'])
            ->withCount(['likes', 'comments'])
            ->when($excludeIds->isNotEmpty(), fn($q) => $q->whereNotIn('id', $excludeIds))
            ->when($cursor > 0, fn($q) => $q->where('id', '<', $cursor));

        // Half newest, half most-engaged — merge for diversity
        $newest = (clone $q)->orderByDesc('published_at')->limit((int) ($limit / 2))->get();
        $engaged = (clone $q)->orderByDesc('views_count')->limit((int) ($limit / 2))->get();

        return $newest->concat($engaged)
            ->unique('id')
            ->values();
    }

    /**
     * IDs of videos this user watched in the last 7 days.
     * Cached 10 minutes to avoid DB hits on every scroll.
     */
    private function getRecentlySeenIds(?int $userId): Collection
    {
        if (!$userId)
            return collect();

        return Cache::remember("feed_seen:{$userId}", 600, function () use ($userId) {
            // Use video_views table which already exists
            return DB::table('video_views')
                ->where('user_id', $userId)
                ->where('created_at', '>=', now()->subDays(7))
                ->orderByDesc('created_at')
                ->limit(200)
                ->pluck('video_id')
                ->unique();
        });
    }

    /**
     * Bust the seen cache after marking new videos as seen.
     * We don't write to a separate table — video_views already tracks this.
     */
    private function markAsSeen(int $userId, Collection $videoIds): void
    {
        // Bust cache so next feed refresh picks up new views
        Cache::forget("feed_seen:{$userId}");
    }
}