<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sound extends Model
{
    protected $fillable = [
        'source', 'user_id', 'video_id', 'title', 'artist', 'file_path', 'cover_path',
        'duration', 'license', 'license_url', 'attribution', 'uses_count', 'is_active', 'is_public',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'duration'  => 'integer',
        'uses_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    public function scopeActive($q)
    {
        return $q->where('is_active', true);
    }

    /** Same rule as Video::buildUrl so sounds follow whichever disk the app uses. */
    public static function urlFor(?string $path): ?string
    {
        if (!$path) return null;
        if (str_starts_with($path, 'http')) return $path;

        $disk = config('filesystems.default', 'public');
        if (!in_array($disk, ['public', 'local'])) {
            return rtrim(config('filesystems.disks.' . $disk . '.url', ''), '/') . '/' . ltrim($path, '/');
        }
        return '/storage/' . ltrim($path, '/');
    }

    public function toApi(?int $viewerId = null): array
    {
        return [
            'id'         => $this->id,
            'title'      => $this->title,
            'artist'     => $this->artist,
            'duration'   => $this->duration,
            'url'        => self::urlFor($this->file_path),
            'cover_url'  => self::urlFor($this->cover_path),
            'source'     => $this->source,
            'uses_count' => $this->uses_count,
            'mine'       => $viewerId !== null && $this->user_id === $viewerId,
            'is_public'  => $this->is_public,
            'attribution' => $this->attribution,
        ];
    }
}
