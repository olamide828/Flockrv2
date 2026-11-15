<?php

namespace App\Services;

use App\Models\AppSetting;
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
    const PRO_BOOST_MULTIPLIER = 1.15; // Pro sellers' videos score 15% higher in ranking

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

        // Entertainment first, shopping slipped in (never back-to-back) — see mixEntertainmentAndShopping()
        $final = $this->mixEntertainmentAndShopping($ranked->values(), $candidates, $limit, $affinities, $isNewUser);

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

        public function getNearMeFeed(?int $userId, ?string $location, int $cursor = 0, int $limit = 10): Collection
    {
        if (!$location || trim($location) === '') {
            return collect();
        }

        $blockedIds = $this->blockedAndBlockingIds($userId);

        $city = trim(explode(',', $location)[0]);

        return Video::active()
            ->with([
                'user:id,name,username,avatar,is_verified,location',
                'products' => fn($q) => $q->where('status', 'active')->with('seller:id,name,username'),
            ])
            ->withCount(['allComments'])
            ->whereHas('user', fn ($q) => $q->where('location', 'ilike', "%{$city}%"))
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
        $q->where(function ($inner) use ($affinities) {
            $inner->whereHas('products', fn ($pq) => $pq->whereIn('category_id', array_keys($affinities['categories'])))
                  ->orWhereIn('ai_category_id', array_keys($affinities['categories']));
        });
    }

    $results = $q->orderByDesc('likes_count')->limit($limit)->get();

    // Not enough direct matches — try adjacent categories before falling back to raw popularity
    if ($results->count() < $limit && !empty($affinities['categories'])) {
        $adjacentCatIds = $this->getAdjacentCategoryIds(array_keys($affinities['categories']));
        if (!empty($adjacentCatIds)) {
            $adjacent = (clone $base)
                ->whereNotIn('id', $results->pluck('id'))
                ->where(function ($inner) use ($adjacentCatIds) {
                    $inner->whereHas('products', fn ($pq) => $pq->whereIn('category_id', $adjacentCatIds))
                          ->orWhereIn('ai_category_id', $adjacentCatIds);
                })
                ->orderByDesc('likes_count')
                ->limit($limit - $results->count())
                ->get();
            $results = $results->concat($adjacent);
        }
    }

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

private function getAdjacentCategoryIds(array $categoryIds): array
{
    $map = config('category_adjacency');
    $names = \App\Models\Category::whereIn('id', $categoryIds)->pluck('name', 'id');

    $adjacentNames = collect($categoryIds)
        ->flatMap(fn ($id) => $map[$names[$id] ?? ''] ?? [])
        ->unique();

    return \App\Models\Category::whereIn('name', $adjacentNames)->pluck('id')->toArray();
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

        $baseScore = (self::W_QUALITY * $quality)
    + (self::W_PERSONALIZATION * $personalization)
    + (self::W_COMMERCE * $commerce)
    + (self::W_RECENCY * $recency)
    + (self::W_NOVELTY * $novelty)
    + $velocityBonus;

$proBoost = ($video->relationLoaded('user') && $video->user?->hasActiveSubscription())
    ? self::PRO_BOOST_MULTIPLIER
    : 1.0;

return $baseScore * $proBoost;
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

        if ($video->ai_category_id && !empty($affinities['categories'][$video->ai_category_id])) {
    $score += min(1.0, $affinities['categories'][$video->ai_category_id]);
    $hits++;
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


    // ── Entertainment / Shopping mix ──────────────────────────────────────────
    //  "Entertainment gets you discovered. Shopping gets you paid."
    //  ~70% entertainment, ~30% shopping (admin-tunable: AppSetting feed.shop_ratio),
    //  never two shopping videos in a row, and each shopping video is chosen to match
    //  the entertainment video right before it.

    public static function isShopping(Video $v): bool
    {
        return (bool) $v->is_for_sale || ($v->content_type ?? null) === 'shopping';
    }

    public function shopRatio(bool $isNewUser = false): float
    {
        $r = (float) AppSetting::get('feed.shop_ratio', 0.30);
        $r = max(0.0, min(0.5, $r));           // 0.5 max keeps a shop video from ever being adjacent
        return $isNewUser ? $r * 0.5 : $r;      // brand-new people get entertainment first
    }

    private function mixEntertainmentAndShopping(
        Collection $ranked,
        Collection $candidates,
        int $limit,
        array $affinities,
        bool $isNewUser,
    ): Collection {
        $shopN = (int) round($limit * $this->shopRatio($isNewUser));
        $entN = $limit - $shopN;

        $entPool = $ranked->reject(fn(Video $v) => self::isShopping($v))->values();
        $shopPool = $ranked->filter(fn(Video $v) => self::isShopping($v))->values();
        $entCandidates = $candidates->reject(fn(Video $v) => self::isShopping($v))->values();

        // Entertainment: diversity + exploration, ranked with no commerce push
        $ent = $this->injectExploration($this->applyDiversity($entPool, $entN), $entCandidates, $entN);
        // Young platform with no entertainment yet: don't serve an empty feed
        if ($ent->isEmpty()) {
            return $this->applyDiversity($shopPool, $limit)->values();
        }
        // Not enough entertainment? let the rest be shopping, but only as many as can be spaced apart.
        $shopN = min($shopN, max(0, (int) floor(($ent->count() + 1) / 2)));
        $shop = $this->applyDiversity($shopPool, $shopN)->values();

        if ($shop->isEmpty()) {
            return $ent->take($limit)->values();
        }

        // Shopping slots: evenly spread, at least one entertainment video between each, never position 0
        $slots = [];
        $total = $ent->count() + $shop->count();
        $prev = 0;
        for ($k = 0; $k < $shop->count(); $k++) {
            $pos = (int) floor(($k + 1) * $total / ($shop->count() + 1));
            $pos = max($pos, $prev + 2, 1);
            if ($pos >= $total) break;
            $slots[] = $pos;
            $prev = $pos;
        }

        $final = collect();
        $entQ = $ent->values();
        $shopLeft = $shop->values();
        for ($i = 0; $i < $total; $i++) {
            if (in_array($i, $slots, true) && $shopLeft->isNotEmpty()) {
                $anchor = $final->last();   // the entertainment video that came right before
                $pick = $anchor ? $this->mostRelevantShop($shopLeft, $anchor, $affinities) : $shopLeft->first();
                $final->push($pick);
                $shopLeft = $shopLeft->reject(fn($v) => $v->id === $pick->id)->values();
            } elseif ($entQ->isNotEmpty()) {
                $final->push($entQ->shift());
            }
        }
        return $final->take($limit)->values();
    }

    /** Shopping video that best matches what the viewer just watched (tags, category), then by its own rank. */
    private function mostRelevantShop(Collection $shop, Video $anchor, array $affinities): Video
    {
        return $shop->sortByDesc(function (Video $s) use ($anchor, $affinities) {
            $score = (float) ($s->_score ?? 0);
            $a = $this->tagsOf($anchor);
            $b = $this->tagsOf($s);
            $score += 0.15 * count(array_intersect($a, $b));
            if ($anchor->ai_category_id && $anchor->ai_category_id === $s->ai_category_id) $score += 0.3;
            $ca = $this->categoriesOf($anchor);
            if ($ca && array_intersect($ca, $this->categoriesOf($s))) $score += 0.3;
            foreach ($b as $t) {
                if (!empty($affinities['hashtags'][$t])) { $score += 0.1; break; }
            }
            return $score;
        })->first();
    }

    private function tagsOf(Video $v): array
    {
        $h = is_array($v->hashtags) ? $v->hashtags : (json_decode($v->hashtags ?? '[]', true) ?: []);
        return array_values(array_unique(array_map(fn($t) => strtolower(ltrim((string) $t, '#')), $h)));
    }

    private function categoriesOf(Video $v): array
    {
        $ids = $v->relationLoaded('products') ? $v->products->pluck('category_id')->filter()->all() : [];
        if ($v->ai_category_id) $ids[] = $v->ai_category_id;
        return array_values(array_unique($ids));
    }

    /**
     * Shop tab: product videos only, personalised + commerce-weighted (this is where selling signals count).
     */
    public function getShopFeed(?int $userId, int $cursor = 0, int $limit = 10, ?string $sessionId = null): Collection
    {
        $sessionId = $sessionId ?? $this->guestSessionId();
        $affinities = $this->getUserAffinities($userId, $sessionId);
        $blockedIds = $this->blockedAndBlockingIds($userId);
        $seenKey = 'shopseen:' . ($userId ? "u{$userId}" : "s{$sessionId}");
        $seen = collect(Cache::get($seenKey, []));

        $pool = function (Collection $exclude) use ($blockedIds, $limit, $affinities) {
            $base = Video::active()
                ->where(fn($q) => $q->where('is_for_sale', true)->orWhere('content_type', 'shopping'))
                ->with([
                    'user' => fn($q) => $q->select('id', 'name', 'username', 'avatar', 'is_verified', 'location')->withActiveSubscriptionFlag(),
                    'products' => fn($q) => $q->where('status', 'active')->with('seller:id,name,username'),
                ])
                ->withCount(['allComments'])
                ->whereHas('products', fn($q) => $q->where('status', 'active'))
                ->when($exclude->isNotEmpty(), fn($q) => $q->whereNotIn('id', $exclude->take(1500)))
                ->when(!empty($blockedIds), fn($q) => $q->whereNotIn('user_id', $blockedIds));
            $n = max($limit * 4, 40);
            return $this->fetchAffinityMatched(clone $base, $affinities, (int) ceil($n / 3))
                ->concat((clone $base)->orderByDesc('saves_count')->limit((int) ceil($n / 3))->get())
                ->concat((clone $base)->orderByDesc('published_at')->limit((int) ceil($n / 3))->get())
                ->unique('id')->values();
        };

        $candidates = $pool($seen);
        if ($candidates->count() < $limit) {           // seen everything: recycle
            $seen = collect();
            $candidates = $pool($seen);
        }
        if ($candidates->isEmpty()) return collect();

        $scores = VideoScore::whereIn('video_id', $candidates->pluck('id'))->get()->keyBy('video_id');
        $candidates->each(function (Video $v) use ($scores) {
            $s = $scores->get($v->id);
            $v->_quality_score = $s ? (float) $s->quality_score : 0;
            $v->_commerce_score = $s ? (float) $s->commerce_score : 0;
            $v->_velocity_24h = $s ? (int) $s->velocity_24h : 0;
        });
        $maxVelocity = max(1, $candidates->max('_velocity_24h'));
        $isNew = $affinities === [] ;

        $ranked = $candidates->map(function (Video $v) use ($affinities, $seen, $isNew, $maxVelocity) {
            $v->_score = $this->computeScore($v, $affinities, $seen, $isNew, $maxVelocity)
                + 0.1 * min(1.0, ((float) ($v->_commerce_score ?? 0)) / 100);   // Shop tab leans a bit more on selling signals
            return $v;
        })->sortByDesc('_score');

        $final = $this->applyDiversity($ranked, $limit)->values();
        Cache::put($seenKey, $seen->merge($final->pluck('id'))->unique()->take(-500)->values()->all(), 3600);
        return $final;
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