<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OffPlatformWarning extends Model
{
    protected $fillable = ['conversation_id', 'buyer_id', 'seller_id', 'action', 'trigger_keyword'];

    public function conversation(): BelongsTo { return $this->belongsTo(Conversation::class); }
    public function buyer(): BelongsTo { return $this->belongsTo(User::class, 'buyer_id'); }
    public function seller(): BelongsTo { return $this->belongsTo(User::class, 'seller_id'); }
}