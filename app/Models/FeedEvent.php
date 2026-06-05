<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'session_id', 'video_id', 'product_id',
        'event', 'meta', 'occurred_at',
    ];

    protected $casts = [
        'meta'        => 'array',
        'occurred_at' => 'datetime',
    ];

    // Event weight constants — used by scoring engine
    const WEIGHTS = [
        'product_purchase'  => 10.0,
        'product_cart'      => 4.0,
        'product_wishlist'  => 3.0,
        'product_click'     => 2.0,
        'seller_follow'     => 2.5,
        'video_complete'    => 2.0,
        'video_rewatch'     => 2.5,
        'video_share'       => 1.5,
        'seller_visit'      => 1.0,
        'video_skip'        => -3.0,
        'video_hide'        => -5.0,
        'video_report'      => -8.0,
    ];

    public function video(): BelongsTo { return $this->belongsTo(Video::class); }
    public function user(): BelongsTo  { return $this->belongsTo(User::class); }
}