<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Coupon extends Model
{
    protected $fillable = [
        'code', 'buyer_id', 'review_id', 'amount',
        'min_order', 'expires_at', 'used_at', 'used_on_order_id',
    ];

    protected $casts = [
        'amount'     => 'decimal:2',
        'min_order'  => 'decimal:2',
        'expires_at' => 'datetime',
        'used_at'    => 'datetime',
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