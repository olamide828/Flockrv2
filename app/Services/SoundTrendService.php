<?php

namespace App\Services;

use App\Models\Video;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * How a TRENDING SOUND helps a post in the For You feed — without letting a sound alone make anyone viral.
 *
 * 1. A sound is "hot" when several DIFFERENT creators used it in the last 3 days (one person spamming it
 *    doesn't count). Heat goes 0..1 and is capped, so the biggest sound can't swamp everything else.
 * 2. A post using a hot sound gets a lottery ticket. Chance = 15% (lukewarm) … 50% (very hot), re-drawn every
 *    6 hours per post. No ticket, no boost: that's the "luck" part.
 * 3. A winning ticket is only worth something if people actually engage with the post:
 *      - under 30 views: a small probe boost (we don't know yet),
 *      - after that: the boost scales with engagement (likes + saves×2 + comments×3 per view).
 *        ~3% engagement or lower = boost is zero, ~10%+ = full boost.
 *    So a sound gets you a few extra looks; the post itself decides whether it keeps going.
 * 4. The boost is added to the normal score (max about +0.22 on a ~1.0 scale), so great non-sound posts still win.
 */
class SoundTrendService
{
    public const WINDOW_HOURS   = 72;
    public const MIN_CREATORS   = 3;     // different people needed before a sound counts as hot
    public const MAX_BOOST      = 0.22;
    public const PROBE_VIEWS    = 30;
    public const EDGE_WEAK      = 0.03;  // engagement per view at/below which the boost is 0
    public const EDGE_STRONG    = 0.10;  // …and at/above which it is full

    /** @return array<int,float> sound_id => heat (0..1) */
    public function heatMap(): array
    {
        return Cache::remember('sound_heat_map', 600, function () {
            try {
                $rows = DB::table('videos')
                    ->whereNotNull('sound_id')
                    ->where('status', 'active')
                    ->whereNull('deleted_at')
                    ->where('published_at', '>=', now()->subHours(self::WINDOW_HOURS))
                    ->selectRaw('sound_id, COUNT(DISTINCT user_id) AS creators')
                    ->groupBy('sound_id')
                    ->havingRaw('COUNT(DISTINCT user_id) >= ?', [self::MIN_CREATORS])
                    ->orderByDesc('creators')
                    ->limit(40)
                    ->get();
            } catch (\Throwable) {
                return [];
            }

            $map = [];
            foreach ($rows as $r) {
                // 3 creators ≈ 0.25 heat, 20+ creators = 1.0
                $map[(int) $r->sound_id] = round(min(1.0, log(1 + $r->creators) / log(21)), 3);
            }
            return $map;
        });
    }

    public function heatOf(?int $soundId): float
    {
        return $soundId ? ($this->heatMap()[$soundId] ?? 0.0) : 0.0;
    }

    /** Extra score for this video (0 when it has no hot sound, no winning ticket, or weak engagement). */
    public function boost(Video $video): float
    {
        $heat = $this->heatOf($video->sound_id ? (int) $video->sound_id : null);
        if ($heat <= 0) return 0.0;

        // the lottery: stable for 6 hours so the feed doesn't flicker, then re-drawn
        $chance = 0.15 + 0.35 * $heat;
        $roll = (crc32("v{$video->id}:s{$video->sound_id}:" . intdiv(time(), 6 * 3600)) % 1000) / 1000;
        if ($roll >= $chance) return 0.0;

        $views = (int) ($video->views_count ?? 0);
        if ($views < self::PROBE_VIEWS) {
            $strength = 0.5;
        } else {
            $comments = (int) ($video->all_comments_count ?? $video->comments_count ?? 0);
            $eng = ((int) $video->likes_count + 2 * (int) $video->saves_count + 3 * $comments) / max(1, $views);
            $strength = max(0.0, min(1.0, ($eng - self::EDGE_WEAK) / (self::EDGE_STRONG - self::EDGE_WEAK)));
        }

        return round(self::MAX_BOOST * $heat * $strength, 4);
    }

    /** Recent videos using hot sounds, so they actually get into the ranking pool. */
    public function candidateSoundIds(): array
    {
        return array_keys($this->heatMap());
    }
}
