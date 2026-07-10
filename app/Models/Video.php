<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Video extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';
    protected $fillable = [
        'user_id',
        'title',
        'description',
        'video_url',
        'hls_url',
        'thumbnail_url',
        'duration_seconds',
        'file_size_bytes',
        'resolution',
        'status',
        'captions',
        'caption_segments',
        'keywords',
        'hashtags',
        'is_for_sale',
        'published_at',
        'text_overlays',
    ];

    protected $casts = [
        'caption_segments' => 'array',
        'keywords' => 'array',
        'hashtags' => 'array',
        'is_for_sale' => 'boolean',
        'published_at' => 'datetime',
        'text_overlays' => 'array',
    ];

    protected $appends = [
        'video_stream_url',
        'thumbnail_url_full',
        'is_processing',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (Video $video) {
            if (empty($video->ulid)) {
                $video->ulid = (string) Str::ulid();
            }
        });
    }
 
    // Route model binding uses ulid
   

    // ─── Relationships ────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'video_id', 'id');
    }

    public function allComments(): HasMany
    {
        return $this->hasMany(Comment::class, 'video_id', 'id');
    }

    public function likes(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'video_likes', 'video_id', 'user_id', 'id');
    }

    public function views(): HasMany
    {
        return $this->hasMany(VideoView::class, 'video_id', 'id');
    }

    public function savedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'video_saves', 'video_id', 'user_id', 'id');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'video_products', 'video_id', 'product_id', 'id', 'id')
            ->withPivot(['pin_x', 'pin_y', 'pin_timestamp', 'sort_order'])
            ->withTimestamps()
            ->orderByPivot('sort_order');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active')->whereNotNull('published_at');
    }

    public function scopeForFeed($query)
    {
        return $query->active()
            ->with(['user:id,name,username,avatar,is_verified,location', 'products'])
            ->withCount(['likes', 'comments']);
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    /**
     * Build a full URL from a storage path.
     *
     * Logic:
     *  - Already a full URL (starts with http) → return as-is
     *  - Using R2/S3 disk → prepend R2 CDN URL
     *  - Using local/public disk → prepend /storage/ (symlinked)
     */
    private function buildUrl(?string $path): ?string
    {
        if (!$path)
            return null;

        // Already absolute
        if (str_starts_with($path, 'http'))
            return $path;

        $disk = config('filesystems.default', 'public');

        if ($disk === 'r2' || $disk === 's3') {
            $base = rtrim(config('filesystems.disks.' . $disk . '.url', ''), '/');
            return $base . '/' . ltrim($path, '/');
        }

        // Local / public disk — files live in storage/app/public, served via /storage symlink
        return '/storage/' . ltrim($path, '/');
    }

    /**
     * Full playable video URL.
     * Frontend VideoCard uses this as <video src>.
     */
    public function getVideoStreamUrlAttribute(): ?string
    {
        try {
            return $this->buildUrl($this->hls_url ?? $this->video_url);
        } catch (\Illuminate\Database\Eloquent\MissingAttributeException) {
            return null;
        }
    }

    public function getThumbnailUrlFullAttribute(): ?string
    {
        try {
            return $this->buildUrl($this->thumbnail_url);
        } catch (\Illuminate\Database\Eloquent\MissingAttributeException) {
            return null;
        }
    }

    public function getIsProcessingAttribute(): bool
    {
        return in_array($this->status, ['pending', 'processing']);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

  public function recordView(?int $userId, ?string $sessionId, int $watchSeconds): void
{
    // Require minimum watch time
    if ($watchSeconds < 3) {
        return;
    }

    $percent = $this->duration_seconds > 0
        ? min(100, ($watchSeconds / $this->duration_seconds) * 100)
        : 0;

    // Prevent duplicate views within cooldown period
    $recentView = VideoView::query()
        ->where('video_id', $this->id)
        ->when(
            $userId,
            fn ($q) => $q->where('user_id', $userId),
            fn ($q) => $q->where('session_id', $sessionId)
        )
        ->where('created_at', '>=', now()->subMinutes(30))
        ->exists();

    // Still store analytics event if you want deeper metrics
    VideoView::create([
        'video_id'      => $this->id,
        'user_id'       => $userId,
        'session_id'    => $sessionId,
        'watch_seconds' => $watchSeconds,
        'watch_percent' => $percent,
    ]);

    // Only increment public view count if cooldown passed
    if (!$recentView) {
        $this->increment('views_count');
    }
}

    public function tagProduct(Product $product, array $pivot = []): void
    {
        $this->products()->syncWithoutDetaching([$product->id => $pivot]);
        if (!$this->is_for_sale) {
            $this->update(['is_for_sale' => true]);
        }
    }
}