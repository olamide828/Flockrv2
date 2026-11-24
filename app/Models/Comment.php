<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'video_id',
        'parent_id',
        'body',
        'reply_to_username', // who this reply is tagged at (display only)
        'likes_count',
        'is_pinned',
        'image_path',
        'liked_by_creator',
    ];

    protected $casts = [
        'is_pinned'   => 'boolean',
        'likes_count' => 'integer',
        'liked_by_creator' => 'boolean',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? app(\App\Services\StorageService::class)->url($this->image_path) : null;
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    /** Direct replies to this comment (depth 1 only) */
    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id')->with('user:id,name,username,avatar');
    }

    /** Pivot: users who liked this comment */
    public function likedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'comment_likes')
            ->withTimestamps();
    }
}