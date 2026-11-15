<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HashtagService
{
    /** "#Naija Fashion, ootd" → ['naija','fashion','ootd'] (lowercase, unique, max 20) */
    public static function normalize(array|string|null $input): array
    {
        if ($input === null) return [];
        $parts = is_array($input) ? $input : preg_split('/[\s,]+/', $input);
        $out = [];
        foreach ($parts as $p) {
            $t = strtolower(trim(ltrim((string) $p, '#')));
            $t = preg_replace('/[^\p{L}\p{N}_]/u', '', $t);
            if ($t !== '' && mb_strlen($t) <= 40) $out[$t] = true;
        }
        return array_slice(array_keys($out), 0, 20);
    }

    /** Add the difference between old and new tag lists to the counters. $kind = 'videos' | 'products' */
    public function sync(array $old, array $new, string $kind): void
    {
        if (!Schema::hasTable('hashtags')) return;
        $col = $kind === 'products' ? 'products_count' : 'videos_count';
        $old = self::normalize($old);
        $new = self::normalize($new);

        foreach (array_diff($new, $old) as $tag) {
            DB::table('hashtags')->updateOrInsert(['tag' => $tag], ['updated_at' => now()]);
            DB::table('hashtags')->where('tag', $tag)->update([$col => DB::raw("$col + 1"), 'last_used_at' => now()]);
        }
        foreach (array_diff($old, $new) as $tag) {
            DB::table('hashtags')->where('tag', $tag)->where($col, '>', 0)->update([$col => DB::raw("$col - 1")]);
        }
    }

    /** Autocomplete: tags starting with $q, most-used first. Empty $q → trending. */
    public function suggest(string $q, string $kind = 'all', int $limit = 8): array
    {
        if (!Schema::hasTable('hashtags')) return [];
        $q = self::normalize($q)[0] ?? '';
        $total = DB::raw('(videos_count + products_count)');
        $count = match ($kind) { 'products' => 'products_count', 'videos' => 'videos_count', default => $total };

        $rows = DB::table('hashtags')
            ->when($q !== '', fn ($b) => $b->where('tag', 'like', $q . '%'))
            ->whereRaw('(videos_count + products_count) > 0')
            ->orderByDesc($count)->orderBy('tag')
            ->limit($limit)
            ->get(['tag', 'videos_count', 'products_count']);

        return $rows->map(fn ($r) => [
            'tag'   => $r->tag,
            'count' => (int) $r->videos_count + (int) $r->products_count,
            'videos' => (int) $r->videos_count,
            'products' => (int) $r->products_count,
        ])->all();
    }

    /** Rebuild every counter from the JSON columns (backfill + nightly self-heal). */
    public function recount(): int
    {
        if (!Schema::hasTable('hashtags')) return 0;
        $counts = [];
        DB::table('videos')->whereNull('deleted_at')->where('status', 'active')->whereNotNull('hashtags')
            ->orderBy('id')->select('id', 'hashtags')->chunkById(500, function ($rows) use (&$counts) {
                foreach ($rows as $r) {
                    foreach (self::normalize(json_decode($r->hashtags, true) ?: []) as $t) {
                        $counts[$t]['v'] = ($counts[$t]['v'] ?? 0) + 1;
                    }
                }
            });
        DB::table('products')->where('status', 'active')->whereNotNull('tags')
            ->orderBy('id')->select('id', 'tags')->chunkById(500, function ($rows) use (&$counts) {
                foreach ($rows as $r) {
                    foreach (self::normalize(json_decode($r->tags, true) ?: []) as $t) {
                        $counts[$t]['p'] = ($counts[$t]['p'] ?? 0) + 1;
                    }
                }
            });

        DB::table('hashtags')->update(['videos_count' => 0, 'products_count' => 0]);
        foreach ($counts as $tag => $c) {
            DB::table('hashtags')->updateOrInsert(['tag' => $tag], [
                'videos_count' => $c['v'] ?? 0, 'products_count' => $c['p'] ?? 0,
                'last_used_at' => now(), 'updated_at' => now(),
            ]);
        }
        return count($counts);
    }
}
