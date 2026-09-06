<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DisputeMessage extends Model
{
    protected $fillable = ['dispute_id', 'user_id', 'message', 'attachments'];

    protected $casts = [
        'attachments' => 'array',
    ];

    protected $appends = ['attachment_urls'];

    public function dispute(): BelongsTo
    {
        return $this->belongsTo(Dispute::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Same pattern as Review::getPhotoUrlsAttribute() — safe for local or R2/S3.
    public function getAttachmentUrlsAttribute(): array
    {
        $keys = $this->attachments ?? [];
        if (empty($keys)) return [];

        $disk = config('filesystems.default', 'public');
        $base = config("filesystems.disks.{$disk}.url");
        if (!$base) $base = rtrim(config('app.url'), '/') . '/storage';
        $base = rtrim($base, '/');

        return array_values(array_filter(array_map(function ($key) use ($base) {
            if (!$key) return null;
            if (str_starts_with($key, 'http')) return $key;
            return $base . '/' . ltrim($key, '/');
        }, $keys)));
    }
}