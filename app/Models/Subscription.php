<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $fillable = ['user_id', 'plan', 'amount_paid', 'paystack_reference', 'status', 'starts_at', 'expires_at'];
    protected $casts = ['starts_at' => 'datetime', 'expires_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class); }
}