<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class RoomMessageDeleted implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(public int $roomId, public int $messageId)
    {
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("room.{$this->roomId}");
    }

    public function broadcastAs(): string
    {
        return 'RoomMessageDeleted';
    }

    public function broadcastWith(): array
    {
        return ['message_id' => $this->messageId];
    }
}