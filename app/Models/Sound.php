<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sound extends Model
{
    protected $fillable = [
        'ulid', 'source', 'external_id', 'user_id', 'video_id', 'title', 'artist', 'file_path', 'cover_path',
        'duration', 'license', 'license_url', 'attribution', 'uses_count', 'is_active', 'is_public', 'genre',
    ];

    /** Genres an admin can tag library tracks with (also the filter chips in the picker). */
    public const GENRES = ['afrobeats', 'amapiano', 'afro-pop', 'highlife', 'gospel', 'hip-hop', 'rnb', 'dancehall', 'chill'];

    protected $casts = [
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'duration'  => 'integer',
        'uses_count' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (Sound $s) {
            if (empty($s->ulid)) $s->ulid = (string) \Illuminate\Support\Str::ulid();
        });
    }

    /** Pretty path: /@username/sound/ulid. The username is cosmetic; the ulid is what identifies the sound. */
    public function path(): string
    {
        $name = $this->user?->username ?: 'flockr';
        return '/@' . $name . '/sound/' . $this->ulid;
    }

    public function savers()
    {
        return $this->belongsToMany(User::class, 'sound_saves')->withTimestamps();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
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
            'ulid'       => $this->ulid,
            'path'       => $this->path(),
            'is_saved'   => $viewerId !== null && \Illuminate\Support\Facades\DB::table('sound_saves')->where('user_id', $viewerId)->where('sound_id', $this->id)->exists(),
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
            'genre'       => $this->genre,
            'external_id' => $this->external_id,
            'waveform_url' => null,
        ];
    }

    public function videos()
    {
        return $this->hasMany(Video::class);
    }
}
