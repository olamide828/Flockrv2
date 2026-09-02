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
    'terminal_shipment_id', 'escrow_released_at', 'checkout_batch_id',
];

    protected $casts = [
        'subtotal'                => 'decimal:2',
        'shipping_fee'            => 'decimal:2',
        'platform_fee'            => 'decimal:2',
        'total'                   => 'decimal:2',
        'shipping_address'        => 'array',
        'paid_at'                 => 'datetime',
        'shipped_at'              => 'datetime',
        'delivered_at'            => 'datetime',
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

            // 2. Load items with products for stock decrement
            $this->load('items.product');

            // 3. Decrement stock for each item — THIS IS THE MISSING PIECE
            foreach ($this->items as $item) {
                if (!$item->product) continue;

                Product::where('id', $item->product_id)
                    ->where('stock_quantity', '>=', $item->quantity)
                    ->update([
                        'stock_quantity' => DB::raw("GREATEST(stock_quantity - {$item->quantity}, 0)"),
                        'orders_count'   => DB::raw('orders_count + 1'),
                    ]);

                Log::info('Stock decremented', [
                    'product_id' => $item->product_id,
                    'qty_sold'   => $item->quantity,
                ]);
            }

            // 4. Try to create Terminal shipment
            try {
                $terminal = app(\App\Services\TerminalService::class);
                $seller   = $this->seller;
                $address  = \App\Models\UserAddress::find($this->delivery_address_id);

                if ($this->terminal_rate_id && $seller->pickup_street && $address) {
                    $shipment = $terminal->createShipment(
    order:    $this,
    rateId:   $this->terminal_rate_id,
    pickup:   [
        'name'        => $seller->name,
        'phone'       => $seller->phone,
        'email'       => $seller->email,
        'address'     => $seller->pickup_street,
        'city'        => $seller->pickup_city,
        'state'       => $seller->pickup_state,
        'country'     => 'NG',
        'postal_code' => $seller->pickup_postal_code ?? '000000',
    ],
    delivery: array_merge($address->toTerminalFormat(), ['email' => $this->buyer->email]),
    parcel:   [
        'weight'      => 0.5,
        'items_count' => $this->items->count(),
        'description' => 'Flockr order ' . $this->reference,
    ],
);

                    $this->update([
                        'terminal_shipment_id' => $shipment['shipment_id'],
                        'tracking_number'      => $shipment['tracking_number'],
                        'courier'              => $shipment['carrier'],
                    ]);

                    Log::info('Terminal shipment created', [
                        'order'       => $this->reference,
                        'shipment_id' => $shipment['shipment_id'],
                    ]);
                }
            } catch (\Throwable $e) {
                // Don't fail the payment if shipment creation fails
                Log::error('Terminal createShipment failed after payment', [
                    'order' => $this->reference,
                    'error' => $e->getMessage(),
                ]);
            }

            // 6. Update seller stats
            $this->seller->increment('total_sales');

            // 7. Mark coupon as used now that payment is confirmed
            Coupon::where('used_on_order_id', $this->id)
                ->whereNull('used_at')
                ->update(['used_at' => now()]);
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
 * Reverse the wallet credit the seller received when this order was paid.
 * Call this any time a PAID order transitions to a state where the seller
 * should no longer keep the funds (refund, post-payment cancellation).
 * Safe to call even if the order was never paid — it's a no-op then.
 */
public function reverseSellerCredit(string $reason): void
{
    if (!$this->paid_at) {
        return; // never credited in the first place — nothing to reverse
    }

    // Guard against double-reversal if this is somehow called twice
    $alreadyReversed = \App\Models\WalletTransaction::where('user_id', $this->seller_id)
        ->where('order_id', $this->id)
        ->where('source', 'refund')
        ->exists();

    if ($alreadyReversed) {
        return;
    }

    $sellerAmount = $this->total - $this->platform_fee;
    $lastTx = \App\Models\WalletTransaction::where('user_id', $this->seller_id)->latest('id')->first();
    $balanceBefore = $lastTx?->balance_after ?? 0;

    \App\Models\WalletTransaction::create([
        'user_id'       => $this->seller_id,
        'amount'        => $sellerAmount,
        'type'          => 'debit',
        'source'        => 'refund',
        'order_id'      => $this->id,
        'description'   => $reason,
        'balance_after' => $balanceBefore - $sellerAmount,
    ]);
}

/**
 * Release escrowed funds to the seller's wallet.
 * Only fires for delivered orders that haven't already been released.
 * A dispute changes order status away from 'delivered', which naturally
 * excludes the order from the auto-release job — no extra check needed there.
 */
public function releaseEscrow(string $reason = 'Escrow window cleared'): void
{
    if ($this->status !== 'delivered' || $this->escrow_released_at) {
        return;
    }

    DB::transaction(function () use ($reason) {
        $sellerAmount  = $this->total - $this->platform_fee;
        $lastTx        = WalletTransaction::where('user_id', $this->seller_id)->latest('id')->first();
        $balanceBefore = $lastTx?->balance_after ?? 0;

        WalletTransaction::create([
            'user_id'       => $this->seller_id,
            'amount'        => $sellerAmount,
            'type'          => 'credit',
            'source'        => 'sale',
            'order_id'      => $this->id,
            'description'   => "Sale from order {$this->reference} — {$reason}",
            'balance_after' => $balanceBefore + $sellerAmount,
        ]);

        if (in_array('revenue_total', $this->seller->getFillable())) {
            $this->seller->increment('revenue_total', $sellerAmount);
        }

        $this->update(['escrow_released_at' => now()]);
    });
}

}