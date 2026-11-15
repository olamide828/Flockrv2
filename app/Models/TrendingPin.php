<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrendingPin extends Model
{
    protected $fillable = ['kind', 'item_id', 'position', 'expires_at', 'pinned_by'];
    protected $casts    = ['expires_at' => 'datetime'];

    /** Active pins for a kind, in order. Use: TrendingPin::activeIds('post') */
    public static function activeIds(string $kind): array
    {
        try {
            return static::where('kind', $kind)
                ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                ->orderBy('position')->orderByDesc('id')
                ->pluck('item_id')->all();
        } catch (\Throwable) {
            return [];
        }
    }
}
