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
        'name', 'username', 'email', 'phone', 'password',
        'role', 'avatar', 'cover_image', 'bio', 'location',
        'country', 'currency', 'is_verified', 'is_active',
        'paystack_customer_code', 'paystack_subaccount_code',
        'notification_preferences',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at'          => 'datetime',
        'phone_verified_at'          => 'datetime',
        'is_verified'                => 'boolean',
        'is_active'                  => 'boolean',
        'notification_preferences'   => 'array',
    ];

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

    /** Users this user follows */
    public function following(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'follows',
            'follower_id',
            'following_id'
        )->withTimestamps();
    }

    /** Users who follow this user */
    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'follows',
            'following_id',
            'follower_id'
        )->withTimestamps();
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

    public function getAvatarUrlAttribute(): string
    {
        return $this->avatar
            ? config('filesystems.disks.r2.url') . '/' . $this->avatar
            : "https://ui-avatars.com/api/?name={$this->name}&background=random";
    }

    /** Current wallet balance from denormalized transactions */
    public function getWalletBalanceAttribute(): float
    {
        return (float) $this->walletTransactions()
            ->latest()
            ->value('balance_after') ?? 0;
    }
}
