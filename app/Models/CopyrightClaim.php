<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CopyrightClaim extends Model
{
    protected $fillable = ['video_id', 'sound_id', 'reporter_user_id', 'claimant_name', 'claimant_email', 'details', 'status', 'actioned_at', 'admin_note', 'action_taken', 'actioned_by'];
    protected $casts = ['actioned_at' => 'datetime'];

    public function sound() { return $this->belongsTo(Sound::class); }
    public function video() { return $this->belongsTo(Video::class)->withTrashed(); }
}
