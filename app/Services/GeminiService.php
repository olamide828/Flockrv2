<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * One small, fail-safe doorway to Gemini for text-only helpers
 * (semantic search, feed personalisation). Anything that goes wrong
 * returns null and the caller carries on with its normal logic.
 */
class GeminiService
{
    private const MODEL = 'gemini-3.1-flash-lite';

    public function enabled(): bool
    {
        return (bool) $this->key();
    }

    private function key(): ?string
    {
        return config('services.gemini.key') ?: env('GEMINI_API_KEY') ?: null;
    }

    /**
     * Ask for a JSON answer. Cached by $cacheKey for $ttl seconds when given.
     * After a failure the service rests for 60s so a Gemini outage never slows pages.
     */
    public function json(string $prompt, ?string $cacheKey = null, int $ttl = 0, int $timeout = 5): ?array
    {
        if ($cacheKey && $ttl > 0 && ($hit = Cache::get($cacheKey)) !== null) {
            return $hit ?: null;
        }
        $key = $this->key();
        if (!$key || Cache::has('gemini:resting')) return null;

        try {
            $r = Http::timeout($timeout)->post(
                'https://generativelanguage.googleapis.com/v1beta/models/' . self::MODEL . ':generateContent?key=' . $key,
                [
                    'contents'         => [['parts' => [['text' => $prompt]]]],
                    'generationConfig' => ['responseMimeType' => 'application/json', 'temperature' => 0.2],
                ]
            );
            if (!$r->successful()) {
                Log::warning('Gemini HTTP ' . $r->status() . ' ' . substr($r->body(), 0, 200));
                Cache::put('gemini:resting', 1, 60);
                return null;
            }
            $raw    = (string) data_get($r->json(), 'candidates.0.content.parts.0.text', '');
            $parsed = json_decode(trim(preg_replace('/```json|```/', '', $raw)), true);
            if (!is_array($parsed)) return null;

            if ($cacheKey && $ttl > 0) Cache::put($cacheKey, $parsed, $ttl);
            return $parsed;
        } catch (\Throwable $e) {
            Log::warning('Gemini call failed: ' . $e->getMessage());
            Cache::put('gemini:resting', 1, 60);
            return null;
        }
    }

    /**
     * Semantic search helper: related words, synonyms, Nigerian Pidgin and
     * common spellings for what a shopper typed. Returns up to 8 short terms.
     */
    public function expandSearch(string $q): array
    {
        $q = mb_strtolower(trim($q));
        if (mb_strlen($q) < 3 || mb_strlen($q) > 80) return [];

        $out = $this->json(
            "You help a Nigerian social-commerce app (fashion, beauty, gadgets, food, home, services) find things. "
            . "A shopper searched: \"{$q}\".\n"
            . "Return JSON {\"terms\": [...]} with up to 8 short search words or phrases (1-3 words each) that someone "
            . "meaning the same thing might have used in a product title or description: synonyms, closely related items, "
            . "plural/singular, common misspellings, Nigerian Pidgin or local names. No brand names unless in the query. "
            . "Do not repeat the original query.",
            'gemini:search:' . md5($q), 7 * 86400
        );

        $terms = collect($out['terms'] ?? [])
            ->filter(fn ($t) => is_string($t))
            ->map(fn ($t) => mb_strtolower(trim($t)))
            ->filter(fn ($t) => mb_strlen($t) >= 2 && mb_strlen($t) <= 40 && $t !== $q)
            ->unique()->take(8)->values()->all();

        return $terms;
    }
}
