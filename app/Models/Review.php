<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = [
        'order_id', 'buyer_id', 'seller_id', 'product_id',
        'rating', 'body', 'photos',
    ];

    protected $casts = [
        'rating' => 'decimal:1',
        'photos' => 'array',
    ];

    protected $appends = ['photo_urls'];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    /**
     * Returns full CDN URLs for all review photos.
     * Safe for both local (public disk) and R2/S3.
     */
    public function getPhotoUrlsAttribute(): array
    {
        $keys = $this->photos ?? [];
        if (empty($keys)) return [];

        $disk = config('filesystems.default', 'public');
        $base = config("filesystems.disks.{$disk}.url");

        // Fallback for local disk
        if (!$base) {
            $base = rtrim(config('app.url'), '/') . '/storage';
        }

        $base = rtrim($base, '/');

        return array_values(array_filter(array_map(function ($key) use ($base) {
            if (!$key) return null;
            // Already a full URL — return as-is
            if (str_starts_with($key, 'http')) return $key;
            return $base . '/' . ltrim($key, '/');
        }, $keys)));
    }
}