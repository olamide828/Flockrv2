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
        $url = str_starts_with($key, 'http') ? $key : $base . '/' . ltrim($key, '/');
        $ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
        $type = in_array($ext, ['mp4', 'mov', 'webm', 'm4v']) ? 'video' : 'image';
        return ['url' => $url, 'type' => $type];
    }, $keys)));
}
}