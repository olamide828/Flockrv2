<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginHistory extends Model
{

    protected $table = 'login_history'; 
    public $timestamps = false;

protected $fillable = [
    'user_id', 'session_id', 'ip_address', 'user_agent', 'device_type',
    'browser', 'platform', 'city', 'region', 'country', 'created_at',
    'revoked_at', 'is_primary',
];

protected $casts = [
    'created_at' => 'datetime',
];
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}