<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'seller_id', 'category_id', 'name', 'slug', 'description', 'ai_description',
        'price', 'compare_price', 'stock_quantity', 'status', 'condition',
        'images', 'tags', 'attributes', 'ships_nationwide', 'shipping_fee',
        'location', 'saves_count', 'views_count', 'orders_count',
        'is_for_sale', 'is_in_stock',
    ];

    protected $casts = [
        'images'           => 'array',
        'tags'             => 'array',
        'attributes'       => 'array',
        'ships_nationwide' => 'boolean',
        'is_in_stock'      => 'boolean',
        'price'            => 'decimal:2',
        'compare_price'    => 'decimal:2',
        'shipping_fee'     => 'decimal:2',
    ];

    // Always append these computed fields so frontend always gets full URLs
    protected $appends = ['primary_image', 'discount_percent', 'is_in_stock'];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function orders(): BelongsToMany
    {
        return $this->belongsToMany(Order::class, 'order_items');
    }

    public function savedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'product_saves')->withTimestamps();
    }

    public function videos(): BelongsToMany
    {
        return $this->belongsToMany(Video::class, 'video_products')
            ->withPivot(['pin_x', 'pin_y', 'pin_timestamp', 'sort_order'])
            ->withTimestamps();
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

    // ─── Accessors ────────────────────────────────────────────────────────────

    /**
     * Convert a raw storage key to a full CDN URL.
     * Returns null if path is empty.
     */
    private function r2Url(?string $path): ?string
    {
        if (!$path) return null;
        if (str_starts_with($path, 'http')) return $path;
        $base = rtrim(config('filesystems.disks.r2.url', ''), '/');
        return $base . '/' . ltrim($path, '/');
    }

    /**
     * First image as a full URL — used by ProductCard as `product.primary_image`.
     */
    public function getPrimaryImageAttribute(): ?string
    {
        $images = $this->images ?? [];
        if (empty($images)) return null;
        return $this->r2Url($images[0]);
    }

    /**
     * All images as full URLs.
     */
    public function getImageUrlsAttribute(): array
    {
        return array_filter(array_map(
            fn ($img) => $this->r2Url($img),
            $this->images ?? []
        ));
    }

    /**
     * Discount percentage compared to compare_price.
     */
    public function getDiscountPercentAttribute(): ?int
    {
        if (!$this->compare_price || $this->compare_price <= $this->price) return null;
        return (int) round((($this->compare_price - $this->price) / $this->compare_price) * 100);
    }

    /**
     * Is the product in stock? (computed from stock_quantity)
     */
    public function getIsInStockAttribute(): bool
    {
        return ($this->stock_quantity ?? 0) > 0;
    }
}