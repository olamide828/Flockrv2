<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VideoView extends Model
{
    protected $fillable = [
        'video_id', 'user_id', 'session_id',
        'watch_percent', 'watch_seconds', 'ip_address',
    ];

    protected $casts = ['watch_percent' => 'decimal:2'];

    public function video(): BelongsTo { return $this->belongsTo(Video::class); }
    public function user(): BelongsTo  { return $this->belongsTo(User::class); }
}
