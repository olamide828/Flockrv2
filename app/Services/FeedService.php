<?php

namespace App\Services;

use App\Models\FeedEvent;
use App\Models\UserBlock;
use App\Models\UserInterest;
use App\Models\Video;
use App\Models\VideoScore;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FeedService
{
    const W_QUALITY = 0.25;
    const W_PERSONALIZATION = 0.25;
    const W_COMMERCE = 0.20;
    const W_RECENCY = 0.15;
    const W_DIVERSITY = 0.10;
    const W_NOVELTY = 0.05;
    const MAX_PER_SELLER = 2;
    const MAX_PER_CATEGORY = 3;
    const EXPLORATION_RATIO = 0.15;

    // ── Public API ────────────────────────────────────────────────────────────

    public function getForYouPage(
        ?int $userId,
        int $limit = 10,
        int $cursor = 0,
        ?string $sessionId = null,
    ): Collection {
        $sessionId = $sessionId ?? $this->guestSessionId();
        $seenIds = $this->getSeenIds($userId, $sessionId);
        $blockedIds = $this->blockedAndBlockingIds($userId);
        $affinities = $this->getUserAffinities($userId, $sessionId);
        $isNewUser = $this->isNewUser($userId, $sessionId, $seenIds);

        $poolSize = max($limit * 6, 60);
        $candidates = $this->generateCandidates($poolSize, $cursor, $seenIds, $blockedIds, $affinities, $isNewUser);

        if ($candidates->count() < max(3, $limit)) {
            $seenIds = collect();
            $candidates = $this->generateCandidates($poolSize, $cursor, $seenIds, $blockedIds, $affinities, $isNewUser);
        }

        if ($candidates->isEmpty()) {
            return collect();
        }

        // Load pre-computed scores for all candidates in one query (no join)
        $scores = VideoScore::whereIn('video_id', $candidates->pluck('id'))
            ->get()
            ->keyBy('video_id');

        // Attach scores to models as plain attributes
        $candidates->each(function (Video $v) use ($scores) {
            $score = $scores->get($v->id);
            $v->_quality_score = $score ? (float) $score->quality_score : 0;
            $v->_commerce_score = $score ? (float) $score->commerce_score : 0;
            $v->_velocity_24h = $score ? (int) $score->velocity_24h : 0;
        });

        $maxVelocity = max(1, $candidates->max('_velocity_24h'));

        $ranked = $candidates->map(function (Video $video) use ($affinities, $seenIds, $isNewUser, $maxVelocity) {
            $video->_score = $this->computeScore($video, $affinities, $seenIds, $isNewUser, $maxVelocity);
            return $video;
        })->sortByDesc('_score');

        $diverse = $this->applyDiversity($ranked, $limit);
        $final = $this->injectExploration($diverse, $candidates, $limit);

        $this->markSeen($userId, $sessionId, $final->pluck('id')->toArray());

        return $final->values();
    }

    public function getFollowingFeed(?int $userId, int $cursor = 0, int $limit = 10): Collection
    {
        if (!$userId)
            return collect();

        $followingIds = Cache::remember(
            "following:{$userId}",
            120,
            fn() =>
            DB::table('follows')->where('follower_id', $userId)->pluck('following_id')
        );

        if ($followingIds->isEmpty())
            return collect();

        $blockedIds = $this->blockedAndBlockingIds($userId);

        return Video::active()
            ->with([
                'user:id,name,username,avatar,is_verified,location',
                'products' => fn($q) => $q->where('status', 'active')->with('seller:id,name,username'),
            ])
            ->withCount(['allComments'])
            ->whereIn('user_id', $followingIds)
            ->when(!empty($blockedIds), fn($q) => $q->whereNotIn('user_id', $blockedIds))
            ->when($cursor > 0, fn($q) => $q->where('id', '<', $cursor))
            ->orderByDesc('published_at')
            ->limit($limit)
            ->get();
    }

    // ── Candidate Generation — NO leftJoin, pure Eloquent ─────────────────────

    private function generateCandidates(
        int $poolSize,
        int $cursor,
        Collection $seenIds,
        array $blockedIds,
        array $affinities,
        bool $isNewUser,
    ): Collection {
        $slice = (int) ceil($poolSize / 5);

        // Base builder — returns proper Eloquent Video models, no joins
        $base = Video::active()
            ->with([
                'user' => fn($q) => $q->select('id', 'name', 'username', 'avatar', 'is_verified', 'location')
                      ->withActiveSubscriptionFlag(),
                'products' => fn($q) => $q->where('status', 'active')->with('seller:id,name,username'),
            ])
            ->withCount(['allComments'])
            ->when($seenIds->isNotEmpty(), fn($q) => $q->whereNotIn('id', $seenIds->take(2000)))
            ->when(!empty($blockedIds), fn($q) => $q->whereNotIn('user_id', $blockedIds))
            ->when($cursor > 0, fn($q) => $q->where('id', '<', $cursor));

        // Strategy A: affinity-matched
        $affinity = $this->fetchAffinityMatched($base, $affinities, $slice);

        // Strategy B: popular (views_count)
        $popular = (clone $base)
            ->orderByDesc('views_count')
            ->limit($slice)
            ->get();

        // Strategy C: recent
        $recent = (clone $base)
            ->orderByDesc('published_at')
            ->limit($slice)
            ->get();

        // Strategy D: shoppable
        $commerce = (clone $base)
            ->where('is_for_sale', true)
            ->orderByDesc('saves_count')
            ->limit((int) ceil($slice * 0.7))
            ->get();

        // Strategy E: random exploration
        $exploration = (clone $base)
            ->inRandomOrder()
            ->limit((int) ceil($slice * 0.5))
            ->get();

        return $affinity
            ->concat($popular)
            ->concat($recent)
            ->concat($commerce)
            ->concat($exploration)
            ->unique('id')
            ->values();
    }

    private function fetchAffinityMatched($base, array $affinities, int $limit): Collection
    {
        if (empty($affinities['categories']) && empty($affinities['sellers'])) {
            return (clone $base)->orderByDesc('likes_count')->limit($limit)->get();
        }

        $q = clone $base;

        if (!empty($affinities['categories'])) {
            $q->whereHas(
                'products',
                fn($pq) =>
                $pq->whereIn('category_id', array_keys($affinities['categories']))
            );
        }

        $results = $q->orderByDesc('likes_count')->limit($limit)->get();

        if ($results->count() < $limit && !empty($affinities['sellers'])) {
            $extra = (clone $base)
                ->whereIn('user_id', array_keys($affinities['sellers']))
                ->whereNotIn('id', $results->pluck('id'))
                ->orderByDesc('published_at')
                ->limit($limit - $results->count())
                ->get();
            $results = $results->concat($extra);
        }

        return $results;
    }

    // ── Ranking ───────────────────────────────────────────────────────────────

    private function computeScore(
        Video $video,
        array $affinities,
        Collection $seenIds,
        bool $isNewUser,
        int $maxVelocity,
    ): float {
        // Quality (0–1): from pre-computed score or fallback estimate
        $qualityRaw = $video->_quality_score ?? 0;
        $quality = $qualityRaw > 0
            ? min(1.0, $qualityRaw / 100)
            : min(1.0, ($video->likes_count + $video->saves_count * 2) / max(1, $video->views_count) * 10);

        // Personalization (0–1)
        $personalization = ($isNewUser || empty($affinities))
            ? 0.5
            : $this->computePersonalizationScore($video, $affinities);

        // Commerce (0–1)
        $commerceRaw = $video->_commerce_score ?? 0;
        $commerce = $commerceRaw > 0
            ? min(1.0, $commerceRaw / 100)
            : ($video->is_for_sale ? 0.4 : 0.1);

        // Recency — exponential decay, 48h half-life
        $ageHours = max(0, now()->diffInHours($video->published_at ?? now()));
        $recency = exp(-0.693 * $ageHours / 48);
        if ($ageHours < 6)
            $recency = min(1.0, $recency * 1.3);

        // Novelty
        $novelty = $seenIds->contains($video->id) ? 0.0 : 1.0;

        // Velocity bonus
        $velocityBonus = (($video->_velocity_24h ?? 0) / $maxVelocity) * 0.05;

        return (self::W_QUALITY * $quality)
            + (self::W_PERSONALIZATION * $personalization)
            + (self::W_COMMERCE * $commerce)
            + (self::W_RECENCY * $recency)
            + (self::W_NOVELTY * $novelty)
            + $velocityBonus;
    }

    private function computePersonalizationScore(Video $video, array $affinities): float
    {
        $score = 0.0;
        $hits = 0;

        if (!empty($affinities['sellers'][$video->user_id])) {
            $score += min(1.0, $affinities['sellers'][$video->user_id]);
            $hits++;
        }

        if ($video->relationLoaded('products') && $video->products->isNotEmpty()) {
            foreach ($video->products as $product) {
                $catId = $product->category_id ?? null;
                if ($catId && !empty($affinities['categories'][$catId])) {
                    $score += min(1.0, $affinities['categories'][$catId]);
                    $hits++;
                    break;
                }
            }
        }

        $hashtags = is_array($video->hashtags) ? $video->hashtags : [];
        foreach ($hashtags as $tag) {
            $tagNorm = strtolower(ltrim($tag, '#'));
            if (!empty($affinities['hashtags'][$tagNorm])) {
                $score += min(1.0, $affinities['hashtags'][$tagNorm]) * 0.5;
                $hits++;
                break;
            }
        }

        return $hits === 0 ? 0.5 : min(1.0, $score / $hits);
    }

    // ── Diversity ─────────────────────────────────────────────────────────────

    private function applyDiversity(Collection $ranked, int $limit): Collection
    {
        $result = collect();
        $sellerCount = [];
        $categoryCount = [];
        $overflow = collect();

        foreach ($ranked as $video) {
            if ($result->count() >= $limit)
                break;

            $sellerId = $video->user_id;
            $catIds = $video->relationLoaded('products')
                ? $video->products->pluck('category_id')->filter()->toArray()
                : [];
            $catId = $catIds[0] ?? null;

            $sellerFull = ($sellerCount[$sellerId] ?? 0) >= self::MAX_PER_SELLER;
            $categoryFull = $catId && ($categoryCount[$catId] ?? 0) >= self::MAX_PER_CATEGORY;

            if ($sellerFull || $categoryFull) {
                $overflow->push($video);
                continue;
            }

            $result->push($video);
            $sellerCount[$sellerId] = ($sellerCount[$sellerId] ?? 0) + 1;
            if ($catId)
                $categoryCount[$catId] = ($categoryCount[$catId] ?? 0) + 1;
        }

        if ($result->count() < $limit) {
            $result = $result->concat($overflow->take($limit - $result->count()));
        }

        return $result->take($limit);
    }

    private function injectExploration(Collection $diverse, Collection $candidates, int $limit): Collection
    {
        $explorationCount = max(1, (int) floor($limit * self::EXPLORATION_RATIO));
        $mainCount = $limit - $explorationCount;
        $main = $diverse->take($mainCount);
        $mainIds = $main->pluck('id');

        $explorable = $candidates->whereNotIn('id', $mainIds)->values();
        $fresh = $explorable
            ->filter(fn($v) => $v->published_at && $v->published_at->gt(now()->subDays(7)))
            ->shuffle()
            ->take($explorationCount);

        if ($fresh->count() < $explorationCount) {
            $more = $explorable->whereNotIn('id', $fresh->pluck('id'))
                ->shuffle()
                ->take($explorationCount - $fresh->count());
            $fresh = $fresh->concat($more);
        }

        // ✅ Keep everything as a Collection of Eloquent models — never ->toArray()
        $merged = $main->values();
        $pos = 3;

        foreach ($fresh->values() as $video) {
            if ($pos < $merged->count()) {
                $merged = $merged->slice(0, $pos)
                    ->concat(collect([$video]))
                    ->concat($merged->slice($pos))
                    ->values();
                $pos += 5;
            } else {
                $merged = $merged->push($video);
            }
        }

        return $merged->take($limit)->values();
    }

    // ── Affinity ──────────────────────────────────────────────────────────────

    public function getUserAffinities(?int $userId, ?string $sessionId = null): array
    {
        if (!$userId && !$sessionId)
            return [];

        $cacheKey = $userId ? "affinities:user:{$userId}" : "affinities:session:{$sessionId}";

        return Cache::remember($cacheKey, 300, function () use ($userId, $sessionId) {
            $interests = UserInterest::query()
                ->when($userId, fn($q) => $q->where('user_id', $userId))
                ->when(!$userId, fn($q) => $q->where('session_id', $sessionId))
                ->where('score', '>', 0.05)
                ->orderByDesc('score')
                ->limit(50)
                ->get();

            $categories = [];
            $sellers = [];
            $hashtags = [];

            foreach ($interests as $interest) {
                match ($interest->type) {
                    'category' => $categories[$interest->ref_id] = (float) $interest->score,
                    'seller' => $sellers[$interest->ref_id] = (float) $interest->score,
                    'hashtag' => $hashtags[$interest->ref_key] = (float) $interest->score,
                    default => null,
                };
            }

            return compact('categories', 'sellers', 'hashtags');
        });
    }

    public function recordEvent(
        string $event,
        Video $video,
        ?int $userId,
        ?string $sessionId = null,
        array $meta = [],
    ): void {
        $sessionId = $sessionId ?? $this->guestSessionId();
        $weight = FeedEvent::WEIGHTS[$event] ?? 0;

        try {
            FeedEvent::create([
                'user_id' => $userId,
                'session_id' => $sessionId,
                'video_id' => $video->id,
                'event' => $event,
                'meta' => $meta,
                'occurred_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('FeedService::recordEvent failed: ' . $e->getMessage());
            return;
        }

        if ($weight == 0)
            return;

        $this->upsertAffinity($userId, $sessionId, 'seller', $video->user_id, null, $weight);

        if ($video->relationLoaded('products') && $video->products->isNotEmpty()) {
            foreach ($video->products->take(3) as $product) {
                if ($product->category_id) {
                    $this->upsertAffinity($userId, $sessionId, 'category', $product->category_id, null, $weight * 0.8);
                }
            }
        }

        $hashtags = is_array($video->hashtags) ? $video->hashtags : [];
        foreach (array_slice($hashtags, 0, 3) as $tag) {
            $tagNorm = strtolower(ltrim($tag, '#'));
            $this->upsertAffinity($userId, $sessionId, 'hashtag', null, $tagNorm, $weight * 0.5);
        }

        $cacheKey = $userId ? "affinities:user:{$userId}" : "affinities:session:{$sessionId}";
        Cache::forget($cacheKey);
    }

    private function upsertAffinity(
        ?int $userId,
        ?string $sessionId,
        string $type,
        ?int $refId,
        ?string $refKey,
        float $weightDelta,
    ): void {
        try {
            $existing = UserInterest::query()
                ->when($userId, fn($q) => $q->where('user_id', $userId))
                ->when(!$userId, fn($q) => $q->where('session_id', $sessionId))
                ->where('type', $type)
                ->when($refId, fn($q) => $q->where('ref_id', $refId))
                ->when($refKey, fn($q) => $q->where('ref_key', $refKey))
                ->first();

            if ($existing) {
                $newScore = max(-1.0, min(1.0, ($existing->score * 0.98) + ($weightDelta * 0.05)));
                $existing->update([
                    'score' => $newScore,
                    'interaction_count' => $existing->interaction_count + 1,
                    'last_interacted_at' => now(),
                ]);
            } else {
                $initialScore = max(0, min(1.0, $weightDelta * 0.05));
                UserInterest::create([
                    'user_id' => $userId,
                    'session_id' => $sessionId,
                    'type' => $type,
                    'ref_id' => $refId,
                    'ref_key' => $refKey,
                    'score' => $initialScore,
                    'interaction_count' => 1,
                    'last_interacted_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('FeedService::upsertAffinity failed: ' . $e->getMessage());
        }
    }

    // ── Seen tracking ─────────────────────────────────────────────────────────

    private function getSeenIds(?int $userId, ?string $sessionId): Collection
    {
        if (!$userId && !$sessionId)
            return collect();

        $cacheKey = $userId ? "seen:{$userId}" : "seen:session:{$sessionId}";

        return Cache::remember($cacheKey, 600, function () use ($userId, $sessionId) {
            return DB::table('user_seen_videos')
                ->when($userId, fn($q) => $q->where('user_id', $userId))
                ->when(!$userId, fn($q) => $q->where('session_id', $sessionId))
                ->orderByDesc('seen_at')
                ->limit(500)
                ->pluck('video_id');
        });
    }

    private function markSeen(?int $userId, ?string $sessionId, array $videoIds): void
    {
        if (empty($videoIds) || (!$userId && !$sessionId))
            return;

        try {
            $rows = array_map(fn($id) => [
                'user_id' => $userId,
                'session_id' => $sessionId,
                'video_id' => $id,
                'seen_at' => now(),
            ], $videoIds);

            DB::table('user_seen_videos')->upsert(
                $rows,
                $userId ? ['user_id', 'video_id'] : ['session_id', 'video_id'],
                ['seen_at']
            );
        } catch (\Throwable $e) {
            Log::warning('FeedService::markSeen failed: ' . $e->getMessage());
        }

        $cacheKey = $userId ? "seen:{$userId}" : "seen:session:{$sessionId}";
        Cache::forget($cacheKey);
    }

    public function resetSeenVideos(int $userId): void
    {
        DB::table('user_seen_videos')->where('user_id', $userId)->delete();
        Cache::forget("seen:{$userId}");
        Cache::forget("affinities:user:{$userId}");
        Cache::forget("is_new_user:{$userId}");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function isNewUser(?int $userId, ?string $sessionId, Collection $seenIds): bool
    {
        if ($seenIds->count() > 5)
            return false;

        $cacheKey = $userId ? "is_new_user:{$userId}" : "is_new_user:s:{$sessionId}";

        return Cache::remember($cacheKey, 1800, function () use ($userId, $sessionId, $seenIds) {
            if ($seenIds->count() > 5)
                return false;
            if ($userId)
                return DB::table('video_views')->where('user_id', $userId)->count() < 10;
            if ($sessionId)
                return DB::table('user_seen_videos')->where('session_id', $sessionId)->count() < 5;
            return true;
        });
    }

    private function blockedAndBlockingIds(?int $userId): array
    {
        if (!$userId)
            return [];

        return Cache::remember("blocked:{$userId}", 300, function () use ($userId) {
            $iBlocked = UserBlock::where('blocker_id', $userId)->pluck('blocked_id');
            $blockedMe = UserBlock::where('blocked_id', $userId)->pluck('blocker_id');
            return $iBlocked->concat($blockedMe)->unique()->toArray();
        });
    }

    private function guestSessionId(): ?string
    {
        try {
            return request()->cookie('flockr_sid') ?? request()->header('X-Session-ID');
        } catch (\Throwable) {
            return null;
        }
    }
}