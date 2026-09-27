<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportTicket extends Model
{
    protected $fillable = ['user_id', 'conversation_id', 'type', 'message', 'status'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function conversation(): BelongsTo { return $this->belongsTo(Conversation::class); }
}