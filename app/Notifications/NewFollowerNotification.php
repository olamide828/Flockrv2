<?php
namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewFollowerNotification extends Notification
{
    use Queueable;
    public function __construct(public User $follower) {}
    public function via($notifiable): array { return ['database']; }
    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'new_follower',
            'category' => 'social',
            'title'    => 'New Follower',
            'body'     => "@{$this->follower->username} started following you",
            'url'      => "/@{$this->follower->username}",
            'image'    => $this->follower->avatar_url,
            'meta'     => ['user_id' => $this->follower->id, 'username' => $this->follower->username],
        ];
    }
}