<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoomMessageLiked implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $roomId,
        public int $messageId,
        public int $likesCount,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("room.{$this->roomId}");
    }

    public function broadcastAs(): string
    {
        return 'RoomMessageLiked';
    }

    public function broadcastWith(): array
    {
        return [
            'message_id'  => $this->messageId,
            'likes_count' => $this->likesCount,
        ];
    }
}