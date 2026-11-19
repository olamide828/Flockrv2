<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
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
    'shipped_at', 'delivered_at', 'last_rating_reminder_at',
    'cancellation_reason', 'delivery_address_id', 'courier_name', 'courier_fee', 'terminal_rate_id',
    'terminal_shipment_id', 'escrow_released_at', 'checkout_batch_id', 'event_id', 'event_discount_amount',
    'seller_earning', 'flockr_fee', 'discount_amount', 'payment_total',
    'refund_status', 'refund_error', 'refunded_at',
    'estimated_delivery', 'eta_text',
];

    protected $casts = [
        'estimated_delivery'      => 'datetime',
        'subtotal'                => 'decimal:2',
        'shipping_fee'            => 'decimal:2',
        'platform_fee'            => 'decimal:2',
        'total'                   => 'decimal:2',
        'shipping_address'        => 'array',
        'paid_at'                 => 'datetime',
        'shipped_at'              => 'datetime',
        'delivered_at'            => 'datetime',
        'refunded_at'             => 'datetime',
        'seller_earning'          => 'decimal:2',
        'payment_total'           => 'decimal:2',
        'escrow_released_at'      => 'datetime',
        'last_rating_reminder_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (Order $order) {
            if (empty($order->reference)) {
                $order->reference = 'FLK-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
            }
        });

        // Flockr-side milestones for the tracking timeline (courier milestones come from Terminal's webhook).
        static::updated(function (Order $order) {
            if (!$order->wasChanged('status')) return;
            if ($order->status !== 'pending') {
                try { app(\App\Services\StockReservationService::class)->release($order->id); } catch (\Throwable) {}
            }
            $event = ['paid' => 'order.paid', 'processing' => 'order.packed', 'cancelled' => 'order.cancelled'][$order->status] ?? null;
            if ($event) {
                app(\App\Services\OrderTrackingService::class)->log($order, $event, 'flockr', $event === 'order.paid' ? ($order->paid_at ?? now()) : now());
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

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    public function coupon(): HasOne
    {
        return $this->hasOne(Coupon::class, 'used_on_order_id');
    }

    public function dispute(): HasOne
{
    return $this->hasOne(Dispute::class);
}

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    /** Orders that earned real revenue: paid, and not cancelled/refunded. */
    public function scopeRevenue($query)
    {
        return $query->whereNotNull('paid_at')->whereNotIn('status', ['cancelled', 'refunded', 'pending']);
    }

    /**
     * Money Flockr is holding for a seller: paid, still in play (not cancelled/refunded),
     * and not yet released to their wallet.
     */
    public function scopeInEscrow($query)
    {
        return $query->whereNotNull('paid_at')
            ->whereNull('escrow_released_at')
            ->whereIn('status', ['paid', 'confirmed', 'processing', 'shipped', 'delivered', 'disputed']);
    }

    public function scopeForSeller($query, int $sellerId)
    {
        return $query->where('seller_id', $sellerId);
    }

    

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function markAsPaid(string $paystackReference, string $transactionId): void
    {
        if ($this->status !== 'pending') {
            Log::info("Order #{$this->id} already processed, skipping markAsPaid.");
            return;
        }

        DB::transaction(function () use ($paystackReference, $transactionId) {

            // Callback + webhook can arrive together. Lock the row and re-check, so
            // stock is only ever decremented once.
            $fresh = static::whereKey($this->id)->lockForUpdate()->first();
            if (!$fresh || $fresh->status !== 'pending') {
                return;
            }

            // 1. Mark order as paid
            $this->update([
                'status'                  => 'paid',
                'paystack_reference'      => $paystackReference,
                'paystack_transaction_id' => $transactionId,
                'paid_at'                 => now(),
            ]);

            // 2. Load items with products for stock decrement
            $this->load('items.product');

            // 3. Decrement stock for each item — THIS IS THE MISSING PIECE
            foreach ($this->items as $item) {
                if (!$item->product) continue;

                $qty = (int) $item->quantity;
                $updated = Product::where('id', $item->product_id)
                    ->where('stock_quantity', '>=', $qty)
                    ->update([
                        'stock_quantity' => DB::raw("stock_quantity - {$qty}"),
                        'orders_count'   => DB::raw('orders_count + 1'),
                    ]);

                if (!$updated) {
                    // Paid for something that just sold out. Money is taken, so don't hide it:
                    // log loudly so it shows up for admin to refund or restock.
                    Log::critical('OVERSOLD: paid order item had no stock', [
                        'order' => $this->reference, 'product_id' => $item->product_id, 'qty' => $qty,
                    ]);
                    Product::where('id', $item->product_id)->increment('orders_count');
                }

                if ($updated) {
                    $left = (int) Product::whereKey($item->product_id)->value('stock_quantity');
                    if ($left <= 0) {
                        try { $item->product->seller?->notify(new \App\Notifications\ProductSoldOutNotification($item->product)); }
                        catch (\Throwable $e) { Log::warning('sold-out notify failed: ' . $e->getMessage()); }
                    }
                }

                Log::info('Stock decremented', [
                    'product_id' => $item->product_id,
                    'qty_sold'   => $item->quantity,
                ]);
            }

            
            // 6. Update seller stats
            $this->seller->increment('total_sales');

            app(\App\Services\EventService::class)->checkScavengerHunt($this);

            // 7. Mark coupon as used now that payment is confirmed
            app(\App\Services\CouponService::class)->markUsed($this);
        });

        // Notify seller (outside transaction — notification failure shouldn't roll back payment)
        try {
            $this->seller->notify(new \App\Notifications\NewOrderNotification($this));
        } catch (\Throwable) {}
    }

    public function getFormattedTotalAttribute(): string
    {
        return '₦' . number_format($this->total, 2);
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['pending', 'paid', 'confirmed']);
    }

    /**
 * What this seller is owed for the order: item subtotal minus coupon share minus
 * platform fee. Courier cost and Flockr's delivery fee are NEVER the seller's money.
 */
public function sellerAmount(): float
{
    if ($this->seller_earning !== null) {
        return max(0, (float) $this->seller_earning);
    }
    return max(0, (float) $this->subtotal - (float) $this->platform_fee);
}

/**
 * Take back the seller's money for an order that is being refunded/cancelled.
 * Only does anything if escrow was ALREADY released into their wallet; before
 * release the seller never received anything, so there is nothing to take back.
 */
public function reverseSellerCredit(string $reason): void
{
    if (!$this->escrow_released_at) {
        return;
    }

    $wallet = app(\App\Services\WalletService::class);

    try {
        // unique(order_id, source) makes a second reversal impossible.
        $wallet->post(
            userId: $this->seller_id,
            type: 'debit',
            amount: $this->sellerAmount(),
            source: 'refund',
            orderId: $this->id,
            description: $reason,
            allowNegative: true, // seller may already have withdrawn it: admin sees the negative balance
        );
    } catch (\Illuminate\Database\QueryException $e) {
        Log::info("Seller credit already reversed for order {$this->reference}");
    }
}

/**
 * Release escrowed funds to the seller's wallet (delivered orders only, once).
 */
public function releaseEscrow(string $reason = 'Escrow window cleared'): void
{
    DB::transaction(function () use ($reason) {
        $fresh = static::whereKey($this->id)->lockForUpdate()->first();
        if (!$fresh || $fresh->status !== 'delivered' || $fresh->escrow_released_at) {
            return;
        }

        $amount = $this->sellerAmount();

        if ($amount > 0) {
            app(\App\Services\WalletService::class)->post(
                userId: $this->seller_id,
                type: 'credit',
                amount: $amount,
                source: 'sale',
                orderId: $this->id,
                description: "Sale from order {$this->reference} — {$reason}",
            );

            if (in_array('revenue_total', $this->seller->getFillable())) {
                $this->seller->increment('revenue_total', $amount);
            }
        }

        $this->update(['escrow_released_at' => now()]);
    });
}

}
