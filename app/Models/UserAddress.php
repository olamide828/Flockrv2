<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAddress extends Model
{
    protected $fillable = [
        'user_id', 'label', 'recipient_name', 'phone',
        'street', 'city', 'state', 'postal_code', 'country',
        'is_default',  'state_code', 'landmark',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getFullAddressAttribute(): string
    {
        return "{$this->street}, {$this->city}, {$this->state}";
    }

    /**
     * Format for Terminal Africa API.
     * Terminal uses: name, phone, address (=line1), city, state, country, postal_code
     */
   public function toTerminalFormat(): array
{
    return [
        'name'        => $this->recipient_name,
        'phone'       => $this->phone,
        'address'     => $this->street,
        'city'        => $this->city,
        'state'       => $this->state_code ?: $this->state,    
        'country'     => $this->country ?? 'NG',
        'postal_code' => $this->postal_code ?? '000000',
    ];
}
}