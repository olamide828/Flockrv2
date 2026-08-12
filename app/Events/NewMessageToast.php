<?php

namespace App\Events;

use App\Models\Message;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

/**
 * Fired once per recipient whenever a new chat message is sent, broadcast on
 * their PERSONAL channel (not the conversation channel) so a global toast can
 * be shown from anywhere in the app — Inbox.jsx already listens per-
 * conversation while open, this covers every other page.
 */
class NewMessageToast implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(
        public Message $message,
        public User $recipient,
        public int $conversationId,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('App.Models.User.' . $this->recipient->id)];
    }

    public function broadcastAs(): string
    {
        return 'NewMessageToast';
    }

    public function broadcastWith(): array
    {
        $sender = $this->message->sender;

        return [
            'conversation_id' => $this->conversationId,
            'message_id'      => $this->message->id,
            'body'            => \Illuminate\Support\Str::limit($this->message->body, 90),
            'sender' => [
                'id'         => $sender->id,
                'name'       => $sender->name,
                'username'   => $sender->username,
                'avatar_url' => $sender->avatar_url,
            ],
        ];
    }
}