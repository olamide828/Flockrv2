<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PostComment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'post_id', 'user_id', 'parent_id',
        'reply_to_username', 'body', 'likes_count', 'is_pinned',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function replies(): HasMany
    {
        return $this->hasMany(PostComment::class, 'parent_id')->oldest();
    }
}