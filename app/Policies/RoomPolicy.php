<?php

namespace App\Policies;

use App\Models\Room;
use App\Models\User;

class RoomPolicy
{
    /**
     * Only the room's seller can manage it.
     */
    public function manage(User $user, Room $room): bool
    {
        return $user->id === $room->seller_id || $user->isAdmin();
    }

    /**
     * Kick a user — seller only.
     */
    public function kick(User $user, Room $room): bool
    {
        return $user->id === $room->seller_id;
    }

    /**
     * Update rules — seller only.
     */
    public function updateRules(User $user, Room $room): bool
    {
        return $user->id === $room->seller_id;
    }
}