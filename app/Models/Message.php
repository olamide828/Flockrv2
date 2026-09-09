<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = ['conversation_id', 'sender_id', 'body', 'read_at', 'media_path', 'media_type', 'reply_to_id'];

    protected $casts = ['read_at' => 'datetime'];

    public function conversation(): BelongsTo { return $this->belongsTo(Conversation::class); }
    public function sender(): BelongsTo       { return $this->belongsTo(User::class, 'sender_id'); }
    public function replyTo():BelongsTo       { return $this->belongsTo(Message::class, 'reply_to_id'); }
} 

