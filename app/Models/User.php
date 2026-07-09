<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
    'name',
    'username',
    'email',
    'phone',
    'password',
    'role',
    'avatar',
    'cover_image',
    'bio',
    'location',
    'country',
    'currency',
    'is_verified',
    'is_active',
    'last_seen_at',
    'paystack_customer_code',
    'paystack_subaccount_code',
    'notification_preferences',
    'followers_count',
    'following_count',
    'total_sales',
    'preferences',
    'paystack_recipient_code',
    'bank_name',
    'bank_code',
    'account_name',
    'account_last4',
    'account_number',   // ← this was missing
    'pickup_street', 
    'pickup_city', 
    'pickup_state', 
    'pickup_postal_code',
];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'is_verified' => 'boolean',
        'is_active' => 'boolean',
        'notification_preferences' => 'array',
        'preferences' => 'array',
        'last_seen_at' => 'datetime',
    ];

    protected $appends = ['avatar_url', 'is_online'];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function videos(): HasMany
    {
        return $this->hasMany(Video::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'seller_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'buyer_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Order::class, 'seller_id');
    }

    public function following(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'follower_id', 'following_id')->withTimestamps();
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'following_id', 'follower_id')->withTimestamps();
    }

    public function savedProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_saves')->withTimestamps();
    }

    public function savedVideos(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'video_saves')->withTimestamps();
    }

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class, 'conversation_user')->withTimestamps();
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(UserBlock::class, 'blocker_id');
    }

    public function blockedBy(): HasMany
    {
        return $this->hasMany(UserBlock::class, 'blocked_id');
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    /**
     * Full avatar URL — safe for partial selects.
     */
    public function getAvatarUrlAttribute(): string
    {
        try {
            $avatar = $this->getAttributeFromArray('avatar');
        } catch (\Throwable) {
            $avatar = null;
        }

        if ($avatar) {
            if (str_starts_with($avatar, 'http'))
                return $avatar;
            $disk = config('filesystems.default', 'public');
            $base = config("filesystems.disks.{$disk}.url");
            if (!$base)
                $base = rtrim(config('app.url'), '/') . '/storage';
            return rtrim($base, '/') . '/' . ltrim($avatar, '/');
        }

        $name = 'U';
        try {
            $name = $this->getAttributeFromArray('name') ?? 'U';
        } catch (\Throwable) {
        }

        return 'https://ui-avatars.com/api/?name=' . urlencode($name) . '&background=1a1a1a&color=fff&size=128';
    }

    /**
     * Is online — PERMANENTLY SAFE against partial selects.
     * Returns false (not null/crash) when last_seen_at was not selected.
     */
    public function getIsOnlineAttribute(): bool
    {
        try {
            // Use getAttributes() to avoid MissingAttributeException on partial selects
            $attrs = $this->getAttributes();
            if (!array_key_exists('last_seen_at', $attrs))
                return false;
            $lastSeen = $attrs['last_seen_at'];
            if (!$lastSeen)
                return false;
            return \Carbon\Carbon::parse($lastSeen)->gt(now()->subMinutes(5));
        } catch (\Throwable) {
            return false;
        }
    }

    public function getWalletBalanceAttribute(): float
    {
        return (float) ($this->walletTransactions()->latest()->value('balance_after') ?? 0);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isSeller(): bool
    {
        return $this->role === 'seller';
    }
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isFollowing(User $user): bool
    {
        return $this->following()->where('following_id', $user->id)->exists();
    }

    public function hasCompletedOnboarding(): bool
    {
        return !empty($this->preferences['onboarding_completed']);
    }

    public function getInterests(): array
    {
        return $this->preferences['interests'] ?? [];
    }
    public function getBudget(): ?string
    {
        return $this->preferences['budget'] ?? null;
    }

    public function isBlockedBy(User $user): bool
    {
        return UserBlock::where('blocker_id', $user->id)->where('blocked_id', $this->id)->exists();
    }

    public function hasBlocked(User $user): bool
    {
        return UserBlock::where('blocker_id', $this->id)->where('blocked_id', $user->id)->exists();
    }

    public function sellerOrders(): HasMany
{
    return $this->hasMany(Order::class, 'seller_id');
}
}