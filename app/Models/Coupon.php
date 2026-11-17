<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Coupon extends Model
{
    protected $fillable = [
        'code', 'buyer_id', 'review_id', 'amount',
        'min_order', 'expires_at', 'used_at', 'used_on_order_id',
        // promo codes
        'kind', 'percent', 'max_discount', 'is_public', 'is_active', 'max_uses', 'uses_count',
        'per_user_limit', 'new_users_only', 'funded_by', 'campaign', 'starts_at',
    ];

    protected $casts = [
        'amount'     => 'decimal:2',
        'min_order'  => 'decimal:2',
        'expires_at' => 'datetime',
        'used_at'    => 'datetime',
        'starts_at'  => 'datetime',
        'is_public'  => 'boolean',
        'is_active'  => 'boolean',
        'new_users_only' => 'boolean',
        'percent'    => 'decimal:2',
        'max_discount' => 'decimal:2',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }

    public function usedOnOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'used_on_order_id');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isValid(): bool
    {
        return is_null($this->used_at)
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function isUsable(float $orderTotal): bool
    {
        return $this->isValid() && $orderTotal >= $this->min_order;
    }
}