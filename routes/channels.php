<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('conversation.{id}', function ($user, $id) {
    return \App\Models\Conversation::find($id)
        ?->participants()
        ->where('user_id', $user->id)
        ->exists();
});