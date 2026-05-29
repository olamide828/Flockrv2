<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference', 'buyer_id', 'seller_id', 'video_id', 'status',
        'subtotal', 'shipping_fee', 'platform_fee', 'total', 'currency',
        'paystack_reference', 'paystack_transaction_id', 'paid_at',
        'shipping_address', 'tracking_number', 'courier',
        'shipped_at', 'delivered_at', 'cancellation_reason',
    ];

    protected $casts = [
        'subtotal'         => 'decimal:2',
        'shipping_fee'     => 'decimal:2',
        'platform_fee'     => 'decimal:2',
        'total'            => 'decimal:2',
        'shipping_address' => 'array',
        'paid_at'          => 'datetime',
        'shipped_at'       => 'datetime',
        'delivered_at'     => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Order $order) {
            if (empty($order->reference)) {
                $order->reference = 'FLK-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
            }
        });
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeForSeller($query, int $sellerId)
    {
        return $query->where('seller_id', $sellerId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function markAsPaid(string $paystackReference, string $transactionId): void
    {
        // Guard against double-processing (webhook + callback race condition)
        if ($this->status !== 'pending') {
            Log::info("Order #{$this->id} already processed, skipping markAsPaid.");
            return;
        }

        DB::transaction(function () use ($paystackReference, $transactionId) {

            // 1. Mark order as paid
            $this->update([
                'status'                  => 'paid',
                'paystack_reference'      => $paystackReference,
                'paystack_transaction_id' => $transactionId,
                'paid_at'                 => now(),
            ]);

            // 2. Decrement stock for each item in the order
            //    Uses DB-level decrement with a floor of 0 to prevent negative stock
            $this->load('items.product');

            foreach ($this->items as $item) {
                if (!$item->product) continue;

                // Atomic decrement — safe against race conditions
                Product::where('id', $item->product_id)
                    ->where('stock_quantity', '>=', $item->quantity)
                    ->update([
                        'stock_quantity' => DB::raw("GREATEST(stock_quantity - {$item->quantity}, 0)"),
                        'orders_count'   => DB::raw('orders_count + 1'),
                    ]);

                // Reload to check if now out of stock
                $item->product->refresh();

                Log::info("Stock decremented", [
                    'product_id'    => $item->product_id,
                    'qty_sold'      => $item->quantity,
                    'stock_left'    => $item->product->stock_quantity,
                ]);
            }

            // 3. Credit seller wallet (minus platform fee)
            $sellerAmount  = $this->total - $this->platform_fee;
            $lastTx        = WalletTransaction::where('user_id', $this->seller_id)->latest()->first();
            $balanceBefore = $lastTx?->balance_after ?? 0;

            WalletTransaction::create([
                'user_id'       => $this->seller_id,
                'amount'        => $sellerAmount,
                'type'          => 'credit',
                'source'        => 'sale',
                'order_id'      => $this->id,
                'description'   => "Sale from order {$this->reference}",
                'balance_after' => $balanceBefore + $sellerAmount,
            ]);

            // 4. Update seller stats
            $this->seller->increment('total_sales');

            if (in_array('revenue_total', $this->seller->getFillable())) {
                $this->seller->increment('revenue_total', $sellerAmount);
            }
        });
    }

    public function getFormattedTotalAttribute(): string
    {
        return '₦' . number_format($this->total, 2);
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['pending', 'paid', 'confirmed']);
    }
}