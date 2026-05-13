<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Video extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'title', 'description', 'video_url', 'hls_url',
        'thumbnail_url', 'duration_seconds', 'file_size_bytes', 'resolution',
        'status', 'captions', 'caption_segments', 'keywords', 'hashtags',
        'is_for_sale', 'published_at',
    ];

    protected $casts = [
        'caption_segments' => 'array',
        'keywords'         => 'array',
        'hashtags'         => 'array',
        'is_for_sale'      => 'boolean',
        'published_at'     => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'video_products')
            ->withPivot(['pin_x', 'pin_y', 'pin_timestamp', 'sort_order'])
            ->withTimestamps()
            ->orderByPivot('sort_order');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->whereNull('parent_id');
    }

    public function allComments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function likes(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'video_likes')->withTimestamps();
    }

    public function views(): HasMany
    {
        return $this->hasMany(VideoView::class);
    }

    public function savedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'video_saves')->withTimestamps();
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active')->whereNotNull('published_at');
    }

    public function scopeForFeed($query)
    {
        return $query->active()
            ->with(['user:id,name,username,avatar,is_verified', 'products'])
            ->withCount(['likes', 'comments']);
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    public function getVideoStreamUrlAttribute(): string
    {
        return $this->hls_url ?? $this->video_url;
    }

    public function getThumbnailUrlFullAttribute(): ?string
    {
        if (!$this->thumbnail_url) return null;
        return config('filesystems.disks.r2.url') . '/' . $this->thumbnail_url;
    }

    public function getIsProcessingAttribute(): bool
    {
        return in_array($this->status, ['pending', 'processing']);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isLikedBy(User $user): bool
    {
        return $this->likes()->where('user_id', $user->id)->exists();
    }

    public function recordView(int $userId = null, string $sessionId = null, int $watchSeconds = 0): void
    {
        $percent = $this->duration_seconds > 0
            ? min(100, ($watchSeconds / $this->duration_seconds) * 100)
            : 0;

        VideoView::create([
            'video_id'      => $this->id,
            'user_id'       => $userId,
            'session_id'    => $sessionId,
            'watch_seconds' => $watchSeconds,
            'watch_percent' => $percent,
        ]);

        $this->increment('views_count');
    }

    public function tagProduct(Product $product, array $pivot = []): void
    {
        $this->products()->syncWithoutDetaching([
            $product->id => $pivot,
        ]);
        if (!$this->is_for_sale) {
            $this->update(['is_for_sale' => true]);
        }
    }
}
