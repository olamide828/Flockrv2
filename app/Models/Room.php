<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Room extends Model
{
    protected $fillable = [
        'seller_id', 'name', 'slug', 'avatar',
        'description', 'rules', 'is_private',
        'members_count', 'posts_count', 'invite_code',
    ];

    protected $casts = [
        'rules'      => 'array',
        'is_private' => 'boolean',
    ];

    // ── Auto-generate slug from name ─────────────────────────────────────────
    protected static function booted(): void
    {
        static::creating(function (Room $room) {
            if (empty($room->slug)) {
                $room->slug = Str::slug($room->name) . '-' . Str::random(5);
            }
        });
    }

    // ── Avatar URL accessor ───────────────────────────────────────────────────
    public function getAvatarUrlAttribute(): string
    {
        if ($this->avatar) {
            return str_starts_with($this->avatar, 'http')
                ? $this->avatar
                : asset('storage/' . $this->avatar);
        }
        return "https://ui-avatars.com/api/?name=" . urlencode($this->name) . "&background=FF6B35&color=fff";
    }

    protected $appends = ['avatar_url'];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'room_user')
            ->withPivot(['role', 'last_read_at'])
            ->withTimestamps();
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class)->latest();
    }
}