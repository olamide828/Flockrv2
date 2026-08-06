<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Support\Facades\Log;

class CategoryMatcher
{
    /**
     * Maps onboarding interest labels (e.g. "Fashion & Clothing") to
     * Category IDs. Tries an exact name match first, then falls back to
     * matching on the first significant word (e.g. "Fashion").
     * Anything that still doesn't resolve is logged, not silently dropped.
     *
     * @return array<string, int> [interestLabel => categoryId]
     */
    public function match(array $interestLabels): array
    {
        $categories = Category::where('is_active', true)->get(['id', 'name']);
        $map = [];

        foreach ($interestLabels as $label) {
            // 1. Exact match
            $exact = $categories->first(fn ($c) => strcasecmp($c->name, $label) === 0);
            if ($exact) {
                $map[$label] = $exact->id;
                continue;
            }

            // 2. First-word fuzzy match — "Fashion & Clothing" → "Fashion"
            $firstWord = trim(explode('&', $label)[0]);
            $fuzzy = $categories->first(fn ($c) =>
                stripos($c->name, $firstWord) !== false || stripos($firstWord, $c->name) !== false
            );
            if ($fuzzy) {
                $map[$label] = $fuzzy->id;
                continue;
            }

            Log::info('CategoryMatcher: no category match found for onboarding interest', ['label' => $label]);
        }

        return $map;
    }
}