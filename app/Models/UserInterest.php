<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserInterest extends Model
{
    protected $fillable = [
        'user_id', 'session_id', 'type',
        'ref_id', 'ref_key', 'score',
        'interaction_count', 'last_interacted_at',
    ];

    protected $casts = [
        'score'              => 'decimal:4',
        'last_interacted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}