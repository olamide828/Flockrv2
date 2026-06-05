<?php
namespace App\Notifications;

use App\Models\Video;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewVideoNotification extends Notification
{
    use Queueable;
    public function __construct(public Video $video) {}
    public function via($notifiable): array { return ['database']; }
    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'new_video',
            'category' => 'social',
            'title'    => 'New Video',
            'body'     => "@{$this->video->user->username} posted a new video",
            'url'      => "/@{$this->video->user->username}/video/{$this->video->ulid}",
            'image'    => $this->video->user->avatar_url,
            'meta'     => ['user_id' => $this->video->user_id, 'video_id' => $this->video->id],
        ];
    }
}