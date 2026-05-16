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
        'paystack_customer_code',
        'paystack_subaccount_code',
        'notification_preferences',
        'followers_count',
        'following_count',
        'total_sales',
        'preferences',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'is_verified' => 'boolean',
        'is_active' => 'boolean',
        'notification_preferences' => 'array',
        'preferences' => 'array',
    ];

    // Appended so avatar_url is always in JSON output
    // without ever being SELECT'd as a DB column
    protected $appends = ['avatar_url'];

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

    // ─── Accessors ────────────────────────────────────────────────────────────

    /**
     * Full avatar URL — computed from the `avatar` storage key.
     * NEVER select this as a DB column (it doesn't exist in the DB).
     * Safe to use in ->with('user:id,name,username,avatar,is_verified') selects.
     */
    public function getAvatarUrlAttribute(): string
    {
        $avatar = $this->getAttributeFromArray('avatar');

        if ($avatar) {
            if (str_starts_with($avatar, 'http')) {
                return $avatar;
            }

            $base = rtrim(config('filesystems.disks.r2.url', ''), '/');

            return $base . '/' . ltrim($avatar, '/');
        }

        return 'https://ui-avatars.com/api/?name=' .
            urlencode($this->name ?? 'U') .
            '&background=1a1a1a&color=fff&size=128';
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

    public function getDiscountPercentAttribute(): ?int
    {
        try {
            if (!$this->compare_price || $this->compare_price <= $this->price)
                return null;
            return (int) round((($this->compare_price - $this->price) / $this->compare_price) * 100);
        } catch (\Illuminate\Database\Eloquent\MissingAttributeException) {
            return null;
        }
    }

    public function getPrimaryImageAttribute(): ?string
    {
        try {
            $images = $this->images ?? [];
            if (empty($images))
                return null;
            return $this->r2Url($images[0]);
        } catch (\Illuminate\Database\Eloquent\MissingAttributeException) {
            return null;
        }
    }

    public function getIsInStockAttribute(): bool
    {
        try {
            return ($this->stock_quantity ?? 0) > 0;
        } catch (\Illuminate\Database\Eloquent\MissingAttributeException) {
            return false;
        }
    }
}