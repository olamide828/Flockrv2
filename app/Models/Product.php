<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'seller_id', 'category_id', 'name', 'slug', 'description',
        'ai_description', 'price', 'compare_price', 'stock_quantity',
        'sku', 'currency', 'status', 'images', 'tags', 'attributes',
        'condition', 'location', 'ships_nationwide', 'shipping_fee',
        'ai_description_generated_at',
    ];

    protected $casts = [
        'price'                        => 'decimal:2',
        'compare_price'                => 'decimal:2',
        'shipping_fee'                 => 'decimal:2',
        'images'                       => 'array',
        'tags'                         => 'array',
        'attributes'                   => 'array',
        'ships_nationwide'             => 'boolean',
        'ai_description_generated_at'  => 'datetime',
    ];

    // ─── Boot ─────────────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Product $product) {
            if (empty($product->slug)) {
                $product->slug = Str::slug($product->name) . '-' . Str::random(6);
            }
            if (empty($product->sku)) {
                $product->sku = strtoupper(Str::random(10));
            }
        });
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function videos(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'video_products')
            ->withPivot(['pin_x', 'pin_y', 'pin_timestamp', 'sort_order'])
            ->withTimestamps();
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function savedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'product_saves')->withTimestamps();
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeInStock($query)
    {
        return $query->where('stock_quantity', '>', 0);
    }

    public function scopeForSeller($query, int $sellerId)
    {
        return $query->where('seller_id', $sellerId);
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    public function getPrimaryImageAttribute(): ?string
    {
        $images = $this->images;
        if (empty($images)) return null;
        $first = $images[0];
        return config('filesystems.disks.r2.url') . '/' . $first;
    }

    public function getFormattedPriceAttribute(): string
    {
        return '₦' . number_format($this->price, 2);
    }

    public function getDiscountPercentAttribute(): ?int
    {
        if (!$this->compare_price || $this->compare_price <= $this->price) return null;
        return (int) round((($this->compare_price - $this->price) / $this->compare_price) * 100);
    }

    public function getIsInStockAttribute(): bool
    {
        return $this->stock_quantity > 0;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function decrementStock(int $qty = 1): bool
    {
        if ($this->stock_quantity < $qty) return false;
        $this->decrement('stock_quantity', $qty);
        if ($this->stock_quantity === 0) {
            $this->update(['status' => 'out_of_stock']);
        }
        return true;
    }

    public function needsAiDescription(): bool
    {
        return empty($this->ai_description)
            || $this->ai_description_generated_at?->lt(now()->subDays(30));
    }
}
