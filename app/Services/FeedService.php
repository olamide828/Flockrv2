<?php

namespace App\Services;

use App\Models\User;
use App\Models\Video;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FeedService
{
    public function __construct(
        private readonly JinaService $jina,
    ) {}

    /**
     * "For You" feed — semantic similarity via pgvector.
     *
     * Algorithm:
     *  1. Build a user taste vector from their recent likes/watches.
     *  2. Query videos ORDER BY embedding <-> $tasteVector (cosine distance).
     *  3. Exclude already-seen videos this session.
     *  4. Fall back to recency ranking for new/guest users.
     */
    public function getForYouPage(
        ?int $userId,
        int  $limit  = 10,
        int  $cursor = 0,
    ): Collection {
        $tasteVector = $userId ? $this->getUserTasteVector($userId) : null;

        if ($tasteVector) {
            return $this->semanticFeed($tasteVector, $userId, $limit, $cursor);
        }

        return $this->recentFeed($limit, $cursor);
    }

    /**
     * Following feed — videos from accounts the user follows, newest first.
     */
    public function getFollowingFeed(int $userId, int $cursor = 0, int $limit = 10): Collection
    {
        $followingIds = DB::table('follows')
            ->where('follower_id', $userId)
            ->pluck('following_id');

        return Video::active()
            ->forFeed()
            ->whereIn('user_id', $followingIds)
            ->when($cursor, fn ($q) => $q->where('id', '<', $cursor))
            ->orderByDesc('published_at')
            ->limit($limit)
            ->get();
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Build an averaged "taste" embedding from the user's recent interactions.
     * Cached for 30 minutes so we don't hit pgvector on every scroll.
     */
    private function getUserTasteVector(int $userId): ?string
    {
        return Cache::remember("taste_vector:{$userId}", 1800, function () use ($userId) {
            // Get embeddings of last 20 liked/watched videos (>50% completion)
            $rows = DB::select("
                SELECT v.embedding::text
                FROM videos v
                JOIN video_likes vl ON vl.video_id = v.id AND vl.user_id = ?
                WHERE v.embedding IS NOT NULL
                ORDER BY vl.created_at DESC
                LIMIT 10

                UNION

                SELECT v.embedding::text
                FROM videos v
                JOIN video_views vv ON vv.video_id = v.id AND vv.user_id = ?
                WHERE vv.watch_percent >= 50 AND v.embedding IS NOT NULL
                ORDER BY vv.created_at DESC
                LIMIT 10
            ", [$userId, $userId]);

            if (empty($rows)) return null;

            // Average the vectors component-wise in PHP
            $vectors = array_map(function ($row) {
                // Postgres returns vector as string "[0.1,0.2,...]" — parse it
                return array_map('floatval', explode(',', trim($row->embedding, '[]')));
            }, $rows);

            $dim  = count($vectors[0]);
            $avg  = array_fill(0, $dim, 0.0);
            $n    = count($vectors);

            foreach ($vectors as $vec) {
                for ($i = 0; $i < $dim; $i++) {
                    $avg[$i] += $vec[$i] / $n;
                }
            }

            return '[' . implode(',', $avg) . ']';
        });
    }

    /**
     * Semantic similarity query using pgvector cosine distance (<->).
     */
    private function semanticFeed(string $vector, ?int $userId, int $limit, int $cursor): Collection
    {
        $seenIds = $this->getSeenVideoIds($userId);
        $seenClause = $seenIds->isNotEmpty()
            ? 'AND v.id NOT IN (' . $seenIds->implode(',') . ')'
            : '';
        $cursorClause = $cursor ? "AND v.id < {$cursor}" : '';

        // Raw SQL for pgvector ORDER BY — Eloquent doesn't support custom ORDER
        $sql = "
            SELECT v.id
            FROM videos v
            WHERE v.status = 'active'
              AND v.published_at IS NOT NULL
              AND v.embedding IS NOT NULL
              {$seenClause}
              {$cursorClause}
            ORDER BY v.embedding <-> ?::vector
            LIMIT ?
        ";

        $ids = DB::select($sql, [$vector, $limit]);
        $orderedIds = collect($ids)->pluck('id');

        // Hydrate with Eloquent (keeps relations, casts, etc.)
        $videos = Video::forFeed()
            ->whereIn('id', $orderedIds)
            ->get()
            ->sortBy(fn ($v) => $orderedIds->search($v->id)); // preserve order

        return $videos->values();
    }

    /**
     * Fallback: newest active videos, excluding seen.
     */
    private function recentFeed(int $limit, int $cursor): Collection
    {
        return Video::forFeed()
            ->when($cursor, fn ($q) => $q->where('id', '<', $cursor))
            ->orderByDesc('published_at')
            ->limit($limit)
            ->get();
    }

    /**
     * IDs of videos this user watched in the last 7 days — exclude from feed.
     */
    private function getSeenVideoIds(?int $userId): Collection
    {
        if (!$userId) return collect();

        return Cache::remember("seen_videos:{$userId}", 300, function () use ($userId) {
            return DB::table('video_views')
                ->where('user_id', $userId)
                ->where('created_at', '>=', now()->subDays(7))
                ->pluck('video_id')
                ->unique();
        });
    }
}
