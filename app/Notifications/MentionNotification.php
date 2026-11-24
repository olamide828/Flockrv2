<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class MentionNotification extends Notification
{
    use Queueable;

    public function __construct(public User $actor, public string $where, public string $text, public string $url) {}

    public function via($notifiable): array { return ['database']; }

    public function toDatabase($notifiable): array
    {
        $in = match ($this->where) { 'comment' => 'a comment', 'video' => 'a video', 'room' => 'a community room', 'post' => 'a community post', default => 'a post' };
        return [
            'type'     => 'mention',
            'category' => 'social',
            'title'    => 'You were mentioned',
            'body'     => "@{$this->actor->username} mentioned you in {$in}: " . \Illuminate\Support\Str::limit($this->text, 90),
            'url'      => $this->url,
            'image'    => $this->actor->avatar_url,
            'meta'     => ['user_id' => $this->actor->id, 'where' => $this->where],
        ];
    }
}
