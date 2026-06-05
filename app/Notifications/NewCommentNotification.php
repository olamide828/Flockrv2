<?php
namespace App\Notifications;

use App\Models\Comment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewCommentNotification extends Notification
{
    use Queueable;
    public function __construct(public User $commenter, public Comment $comment) {}
    public function via($notifiable): array { return ['database']; }
    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'new_comment',
            'category' => 'social',
            'title'    => 'New Comment',
            'body'     => "@{$this->commenter->username}: {$this->comment->body}",
            'url'      => "/@{$this->comment->video->user->username}/video/{$this->comment->video->ulid}",
            'image'    => $this->commenter->avatar_url,
            'meta'     => ['user_id' => $this->commenter->id, 'comment_id' => $this->comment->id],
        ];
    }
}