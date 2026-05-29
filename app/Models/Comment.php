<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['user_id', 'video_id', 'parent_id', 'body', 'is_pinned'];

    protected $casts = ['is_pinned' => 'boolean'];

    public function user(): BelongsTo    { return $this->belongsTo(User::class); }
    public function video(): BelongsTo
{
    return $this->belongsTo(Video::class, 'video_id', 'id');
}
    public function parent(): BelongsTo  { return $this->belongsTo(Comment::class, 'parent_id'); }
    public function replies(): HasMany   { return $this->hasMany(Comment::class, 'parent_id'); }
}
