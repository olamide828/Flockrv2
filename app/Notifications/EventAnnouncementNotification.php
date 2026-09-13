<?php

namespace App\Notifications;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EventAnnouncementNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Event $event,
        public string $title,
        public string $body,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'event_announcement',
            'category' => 'event',
            'title'    => $this->title,
            'body'     => $this->body,
            'url'      => "/events/{$this->event->id}",
            'image'    => $this->event->banner_image,
            'meta'     => ['event_id' => $this->event->id],
        ];
    }
}