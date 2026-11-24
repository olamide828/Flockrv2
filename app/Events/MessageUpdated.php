<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/** A DM was edited or its reactions changed. Clients listen for `.MessageUpdated`. */
class MessageUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public int $conversationId,
        public int $messageId,
        public ?string $body,
        public ?string $editedAt,
        public array $reactions,
        public ?array $lastReaction = null,
        public ?int $deliveredUpTo = null,
    ) {}

    public function broadcastOn(): array { return [new PrivateChannel("conversation.{$this->conversationId}")]; }
    public function broadcastAs(): string { return 'MessageUpdated'; }
    public function broadcastWith(): array
    {
        return ['message_id' => $this->messageId, 'body' => $this->body, 'edited_at' => $this->editedAt, 'reactions' => $this->reactions, 'last_reaction' => $this->lastReaction, 'delivered_up_to' => $this->deliveredUpTo];
    }
}
