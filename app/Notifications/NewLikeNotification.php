<?php
namespace App\Notifications;

use App\Models\User;
use App\Models\Video;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewLikeNotification extends Notification
{
    use Queueable;
    public function __construct(public User $liker, public Video $video) {}
    public function via($notifiable): array { return ['database']; }
    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'new_like',
            'category' => 'social',
            'title'    => 'New Like',
            'body'     => "@{$this->liker->username} liked your video",
            'url'      => "/@{$this->video->user->username}/video/{$this->video->ulid}",
            'image'    => $this->liker->avatar_url,
            'meta'     => ['user_id' => $this->liker->id, 'video_id' => $this->video->id],
        ];
    }
}