<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Light "AI taste" layer for the feeds. No vectors, no extra tables.
 *
 * Once every 12 hours per user, Gemini is shown a short summary of what the
 * person likes (stated interests, top categories, top hashtags) and answers
 * with ~12 keywords, including a few neighbouring interests so the feed does
 * not shrink into a bubble. The feeds then use those keywords in two ways:
 *   - candidates: videos that match the keywords join the pool,
 *   - score: a small bonus for matching items, on top of the normal ranking.
 * If Gemini is off, slow or wrong, keywords() is [] and nothing changes.
 */
class AiRecommendService
{
    public function __construct(private readonly GeminiService $gemini) {}

    /** @return string[] lowercase keywords, [] when unknown */
    public function keywords(?int $userId): array
    {
        if (!$userId || !$this->gemini->enabled()) return [];

        $key = "ai:keywords:{$userId}";
        $hit = Cache::get($key);
        if (is_array($hit)) return $hit;

        $signals = $this->signals($userId);
        if (!$signals) {                       // brand new user: nothing to learn from yet
            Cache::put($key, [], 600);
            return [];
        }

        $out = $this->gemini->json(
            "A Nigerian social-commerce app wants to personalise a short-video and community feed.\n"
            . "What we know about one user:\n" . json_encode($signals, JSON_UNESCAPED_UNICODE) . "\n"
            . "Return JSON {\"keywords\": [...]} with 12 short words or phrases (1-2 words, lowercase) that would appear in "
            . "titles, descriptions or hashtags of videos and posts this person would enjoy. Include 8 that match their "
            . "interests directly and 4 closely related ones they have not tried, so the feed stays varied. "
            . "No sensitive topics (religion, politics, health).",
            null, 0, 6
        );

        $kw = collect($out['keywords'] ?? [])
            ->filter(fn ($k) => is_string($k))
            ->map(fn ($k) => mb_strtolower(trim($k, " #\t\n")))
            ->filter(fn ($k) => mb_strlen($k) >= 3 && mb_strlen($k) <= 30)
            ->unique()->take(12)->values()->all();

        Cache::put($key, $kw, $kw ? 12 * 3600 : 1800);   // retry sooner after a failed call
        return $kw;
    }

    private function signals(int $userId): array
    {
        $user = \App\Models\User::find($userId);
        $out  = [];

        $stated = method_exists($user, 'getInterests') ? (array) $user->getInterests() : [];
        if ($stated) $out['stated_interests'] = array_slice($stated, 0, 15);

        try {
            $rows = DB::table('user_interests')->where('user_id', $userId)->where('score', '>', 0.05)
                ->orderByDesc('score')->limit(40)->get();

            $catIds = $rows->where('type', 'category')->pluck('ref_id')->all();
            if ($catIds) {
                $names = DB::table('categories')->whereIn('id', $catIds)->pluck('name')->all();
                if ($names) $out['top_categories'] = array_slice($names, 0, 8);
            }
            $tags = $rows->where('type', 'hashtag')->pluck('ref_key')->filter()->take(10)->values()->all();
            if ($tags) $out['top_hashtags'] = $tags;
        } catch (\Throwable) {}

        if ($user && $user->role === 'seller' && $stated) $out['is_seller'] = true;

        return $out;
    }

    /** 0..1 — how many keywords appear in the text */
    public function match(array $keywords, string ...$haystacks): float
    {
        if (!$keywords) return 0.0;
        $text = mb_strtolower(implode(' ', $haystacks));
        $hits = 0;
        foreach ($keywords as $k) if ($k !== '' && str_contains($text, $k)) $hits++;
        return min(1.0, $hits / 2);
    }
}
