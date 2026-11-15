<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderTrackingEvent extends Model
{
    protected $fillable = ['order_id', 'source', 'event', 'title', 'description', 'location', 'occurred_at', 'dedupe_key', 'payload'];
    protected $casts = ['occurred_at' => 'datetime', 'payload' => 'array'];
}
