<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductSku extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'sku_code',
        'variant_options',
        'price',
        'seller_price',
        'stock_quantity',
        'is_active',
    ];

    protected $casts = [
        'variant_options' => 'array',
        'price'           => 'decimal:2',
        'seller_price'    => 'decimal:2',
        'is_active'       => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Human-readable label: "Red / Large"
     */
    public function getLabelAttribute(): string
    {
        return implode(' / ', array_values($this->variant_options ?? []));
    }

    /**
     * Effective price — falls back to parent product price if SKU has none
     */
    public function getEffectivePriceAttribute(): float
    {
        return (float) ($this->price ?? $this->product->price);
    }

    public function getIsInStockAttribute(): bool
    {
        return $this->stock_quantity > 0;
    }
}