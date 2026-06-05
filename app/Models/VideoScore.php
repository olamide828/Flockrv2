<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VideoScore extends Model
{
    protected $fillable = [
        'video_id', 'watch_through_rate', 'engagement_rate',
        'save_rate', 'share_rate', 'purchase_rate', 'cart_rate',
        'velocity_24h', 'quality_score', 'commerce_score', 'creator_score',
        'scored_at',
    ];

    protected $casts = [
        'watch_through_rate' => 'decimal:2',
        'engagement_rate'    => 'decimal:4',
        'save_rate'          => 'decimal:4',
        'share_rate'         => 'decimal:4',
        'purchase_rate'      => 'decimal:4',
        'cart_rate'          => 'decimal:4',
        'quality_score'      => 'decimal:2',
        'commerce_score'     => 'decimal:2',
        'creator_score'      => 'decimal:2',
        'scored_at'          => 'datetime',
    ];

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}