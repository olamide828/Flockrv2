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
    'account_number',   
    'pickup_street', 
    'pickup_city', 
    'pickup_state', 
    'pickup_state_code', 
    'pickup_postal_code',
    'deletion_scheduled_at',
    'email_verified_at',
    'deleted_name',
    'deleted_email',
    'suspension_reason',
    'suspended_at',
    'chat_theme',
    'username_changed_at',
    'name_changed_at',
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
        'deletion_scheduled_at' => 'datetime',
        'is_flockr_support' => 'boolean',
        'username_changed_at' => 'datetime',
        'name_changed_at' => 'datetime',

    ];

    protected $appends = ['avatar_url', 'is_online', 'verification_type', 'name_changeable_at', 'username_changeable_at'];

    public const NAME_COOLDOWN_DAYS = 7;
    public const USERNAME_COOLDOWN_DAYS = 30;
    private static bool $identityLimitsOff = false;

    /** Run $fn without name/username cooldowns (account deletion, imports, admin tools). */
    public static function withoutIdentityLimits(callable $fn)
    {
        $prev = self::$identityLimitsOff;
        self::$identityLimitsOff = true;
        try { return $fn(); } finally { self::$identityLimitsOff = $prev; }
    }

    protected static function booted(): void
    {
        static::updating(function (User $u) {
            if (self::$identityLimitsOff) return;
            $admin = \Illuminate\Support\Facades\Auth::user();
            $isAdmin = $admin && $admin->role === 'admin' && $admin->id !== $u->id;
            $fresh = $u->created_at && $u->created_at->gt(now()->subHours(24)) && !$u->username_changed_at;
            $becomingSeller = $u->isDirty('role') && $u->role === 'seller';

            foreach (['name' => ['name_changed_at', self::NAME_COOLDOWN_DAYS, 'name'], 'username' => ['username_changed_at', self::USERNAME_COOLDOWN_DAYS, 'username']] as $field => [$col, $days, $label]) {
                if (!$u->isDirty($field) || !$u->getOriginal($field)) continue;
                if ($isAdmin || $becomingSeller) continue;
                if ($field === 'name' && $fresh) continue;
                if ($field === 'username' && $fresh) { $u->$col = now(); continue; }
                $last = $u->getOriginal($col);
                if ($last && \Illuminate\Support\Carbon::parse($last)->addDays($days)->isFuture()) {
                    $next = \Illuminate\Support\Carbon::parse($last)->addDays($days)->format('j M Y');
                    throw \Illuminate\Validation\ValidationException::withMessages([$field => "You can change your {$label} again on {$next}."]);
                }
                $u->$col = now();
            }
        });
    }

    public function getNameChangeableAtAttribute(): ?string
    {
        $t = $this->name_changed_at;
        return $t && $t->copy()->addDays(self::NAME_COOLDOWN_DAYS)->isFuture() ? $t->copy()->addDays(self::NAME_COOLDOWN_DAYS)->toIso8601String() : null;
    }

    public function getUsernameChangeableAtAttribute(): ?string
    {
        $t = $this->username_changed_at;
        return $t && $t->copy()->addDays(self::USERNAME_COOLDOWN_DAYS)->isFuture() ? $t->copy()->addDays(self::USERNAME_COOLDOWN_DAYS)->toIso8601String() : null;
    }

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
        $attrs = $this->getAttributes();

        if (array_key_exists('is_flockr_support', $attrs) && $attrs['is_flockr_support']) {
            return true; // Flockr Support is always available
        }

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
    // latest() alone only orders by created_at, which has second-level
    // precision — ties (e.g. from multi-seller cart checkouts crediting
    // several WalletTransaction rows in the same second) can resolve in
    // either direction, sometimes surfacing an OLDER balance_after and
    // making the displayed balance look like it dropped. id DESC as a
    // tiebreaker guarantees true insertion order regardless of timestamp.
    return (float) (
        $this->walletTransactions()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->value('balance_after') ?? 0
    );
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

public function getVerificationTypeAttribute(): ?string
{
    $isVerified = false;
    try {
        $isVerified = (bool) $this->getAttributeFromArray('is_verified');
    } catch (\Throwable) {
        $isVerified = false;
    }

    if ($isVerified) {
        return 'flockr';
    }

    if ($this->hasActiveSubscription()) {
        return 'subscription';
    }

    return null;
}

public function isVerified(): bool
{
    return $this->verification_type !== null;
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

public function rooms(): BelongsToMany
{
    return $this->belongsToMany(Room::class, 'room_user')
        ->withPivot(['role', 'last_read_at'])
        ->withTimestamps();
}

public function posts(): HasMany
{
    return $this->hasMany(\App\Models\Post::class);
}

public function loginHistory(): HasMany
{
    return $this->hasMany(LoginHistory::class);
}

public function subscriptions(): HasMany
{
    return $this->hasMany(Subscription::class);
}

public function activeSubscription(): ?Subscription
{
    return $this->subscriptions()
        ->where('status', 'active')
        ->where('expires_at', '>', now())
        ->latest('expires_at')
        ->first();
}

public function hasActiveSubscription(): bool
{
    if (array_key_exists('has_active_subscription_flag', $this->attributes)) {
        return (bool) $this->attributes['has_active_subscription_flag'];
    }

    return $this->subscriptions()
        ->where('status', 'active')
        ->where('expires_at', '>', now())
        ->exists();
}

public function scopeWithActiveSubscriptionFlag($query)
{
    return $query->withExists(['subscriptions as has_active_subscription_flag' => function ($q) {
        $q->where('status', 'active')->where('expires_at', '>', now());
    }]);
}

public function badges(): BelongsToMany
{
    return $this->belongsToMany(Badge::class, 'user_badges')->withPivot('awarded_at');
}

public function offPlatformWarningsReceived(): HasMany
{
    return $this->hasMany(\App\Models\OffPlatformWarning::class, 'seller_id');
}

public function likedVideos(): BelongsToMany
{
    return $this->belongsToMany(Video::class, 'video_likes')->withTimestamps();
}

}