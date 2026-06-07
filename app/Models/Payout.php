<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payout extends Model
{
    // In Payout model, add 'reference' and 'paid_at' to fillable:
    protected $fillable = [
        'seller_id',
        'amount',
        'currency',
        'status',
        'paystack_transfer_code',
        'reference',   // ← add reference
        'order_ids',
        'paid_at',
        'failure_reason'
    ];
    protected $casts = ['amount' => 'decimal:2', 'order_ids' => 'array', 'paid_at' => 'datetime'];
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }
}
