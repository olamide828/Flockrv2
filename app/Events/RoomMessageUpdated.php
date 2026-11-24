<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/** A room message was edited or its reactions changed. Clients listen for `.RoomMessageUpdated`. */
class RoomMessageUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public int $roomId,
        public int $messageId,
        public ?string $body,
        public ?string $editedAt,
        public array $reactions,
    ) {}

    public function broadcastOn(): array { return [new PrivateChannel("room.{$this->roomId}")]; }
    public function broadcastAs(): string { return 'RoomMessageUpdated'; }
    public function broadcastWith(): array
    {
        return ['message_id' => $this->messageId, 'body' => $this->body, 'edited_at' => $this->editedAt, 'reactions' => $this->reactions];
    }
}
