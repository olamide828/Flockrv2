<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomMessage extends Model
{
    // NOTE: no more SoftDeletes trait/use — deletion is now handled via the
    // is_deleted flag so placeholders can render for every client. If your
    // table still has a deleted_at column that's fine, it's just unused now.

    protected $fillable = [
        'room_id', 'user_id', 'reply_to_id',
        'body', 'media_url', 'media_type',
        'is_system', 'is_deleted',
    ];

    protected $casts = [
        'is_system'  => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(RoomMessage::class, 'reply_to_id')
            ->with('user:id,name,username,avatar');
    }
}