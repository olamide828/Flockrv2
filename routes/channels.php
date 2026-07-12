<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('conversation.{id}', function ($user, $id) {
    return \App\Models\Conversation::find($id)
        ?->participants()
        ->where('user_id', $user->id)
        ->exists();
});

Broadcast::channel('room.{roomId}', function ($user, $roomId) {
    // User must be a member of the room to listen
    return \Illuminate\Support\Facades\DB::table('room_user')
        ->where('user_id', $user->id)
        ->where('room_id', $roomId)
        ->exists();
});