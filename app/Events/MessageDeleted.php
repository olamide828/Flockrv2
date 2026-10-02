<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class MessageDeleted implements ShouldBroadcastNow
{
    use InteractsWithSockets;

    public function __construct(public int $messageId, public int $conversationId) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversation.' . $this->conversationId)];
    }

    public function broadcastAs(): string
    {
        return 'MessageDeleted';
    }

    public function broadcastWith(): array
    {
        return ['message_id' => $this->messageId];
    }
}