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
        'seller_id',
        'category_id',
        'name',
        'slug',
        'description',
        'ai_description',
        'price',
        'compare_price',
        'stock_quantity',
        'status',
        'condition',
        'images',
        'tags',
        'attributes',
        'ships_nationwide',
        'shipping_fee',
        'location',
        'saves_count',
        'views_count',
        'orders_count',
        'is_for_sale',
        'is_in_stock',
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

    // primary_image, is_in_stock, and discount_percent are safe to append:
    // all three are guarded against MissingAttributeException.
    // is_in_stock MUST be in $appends so ProductCard always receives it.
    protected $appends = ['primary_image', 'is_in_stock', 'discount_percent', 'image_urls'];

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

    // ─── URL builder ─────────────────────────────────────────────────────────

    /**
     * Build a full URL from a storage key.
     * Works for both local (public disk) and R2/S3.
     */
    private function storageUrl(?string $path): ?string
    {
        if (!$path) return null;

        // Already a full URL — return as-is
        if (str_starts_with($path, 'http')) return $path;

        $disk = config('filesystems.default', 'public');

        // For R2/S3 — use the configured URL
        $base = config("filesystems.disks.{$disk}.url");

        // For local public disk — use app URL + /storage
        if (!$base) {
            $base = rtrim(config('app.url'), '/') . '/storage';
        }

        return rtrim($base, '/') . '/' . ltrim($path, '/');
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    /**
     * First image as full URL.
     * Safe in $appends: $this->images returns [] when not selected.
     */
    public function getPrimaryImageAttribute(): ?string
    {
        try {
            $images = $this->getAttributes()['images'] ?? null;
            $images = is_string($images) ? json_decode($images, true) : $images;
            if (empty($images) || !is_array($images)) return null;
            return $this->storageUrl($images[0]);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * All images as full URLs.
     * Used by ProductShow to display the image gallery.
     */
    public function getImageUrlsAttribute(): array
    {
        try {
            $images = $this->getAttributes()['images'] ?? null;
            $images = is_string($images) ? json_decode($images, true) : $images;
            if (empty($images) || !is_array($images)) return [];
            return array_values(array_filter(array_map(
                fn($img) => $this->storageUrl($img),
                $images
            )));
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Discount percent.
     * Guarded against partial selects.
     */
    public function getDiscountPercentAttribute(): ?int
    {
        try {
            $compare = (float) ($this->getAttributes()['compare_price'] ?? 0);
            $price   = (float) ($this->getAttributes()['price']         ?? 0);
            if (!$compare || !$price || $compare <= $price) return null;
            return (int) round((($compare - $price) / $compare) * 100);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * In-stock flag.
     * MUST be in $appends so ProductCard.jsx always receives it.
     * Guarded against partial selects.
     */
    public function getIsInStockAttribute(): bool
    {
        try {
            return ((int) ($this->getAttributes()['stock_quantity'] ?? 0)) > 0;
        } catch (\Throwable) {
            return false;
        }
    }
}