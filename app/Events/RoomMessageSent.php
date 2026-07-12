<?php

namespace App\Events;

use App\Models\RoomMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoomMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public RoomMessage $message) {}

    // Mirror the same pattern as MessageSent — private channel per room
    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("room.{$this->message->room_id}");
    }

    public function broadcastAs(): string
    {
        return 'RoomMessageSent';
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing([
            'user:id,name,username,avatar',
            'replyTo.user:id,name,username,avatar',
        ]);

        return [
            'message' => array_merge($this->message->toArray(), [
                'user' => array_merge($this->message->user->toArray(), [
                    'avatar_url' => $this->message->user->avatar_url,
                ]),
            ]),
        ];
    }
}