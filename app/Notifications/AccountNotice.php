<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * One reusable "tell the user something happened" notification: in-app + email.
 * Used for gifts, seller cleared, dispute outcomes, support replies, payouts, event results, hunt rewards, etc.
 *
 *   $user->notify(new AccountNotice('seller_cleared', 'You have been cleared', 'Your account is back to normal.', '/seller/dashboard', 'Open dashboard'));
 */
class AccountNotice extends Notification
{
    use Queueable;

    public function __construct(
        public string $type,
        public string $title,
        public string $body,
        public ?string $url = null,
        public ?string $actionLabel = null,
        public string $category = 'account',
        public array $meta = [],
        public array $lines = [],        // extra bullet lines for the email only
        public bool $email = true,
    ) {}

    public function via($notifiable): array
    {
        return $this->email && !empty($notifiable->email) ? ['mail', 'database'] : ['database'];
    }

    public function toMail($notifiable): MailMessage
    {
        $m = (new MailMessage)->subject($this->title)->greeting('Hi ' . ($notifiable->name ?: 'there') . ',')->line($this->body);
        foreach ($this->lines as $l) $m->line($l);
        if ($this->url) $m->action($this->actionLabel ?: 'Open Flockr', url($this->url));
        return $m->line('Thanks for being part of Flockr.');
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'     => $this->type,
            'category' => $this->category,
            'title'    => $this->title,
            'body'     => $this->body,
            'url'      => $this->url,
            'image'    => null,
            'meta'     => $this->meta,
        ];
    }

    /** Fire-and-forget: a mail outage must never break the action that triggered it. */
    public static function send($user, string $type, string $title, string $body, ?string $url = null, ?string $action = null, string $category = 'account', array $meta = [], array $lines = []): void
    {
        if (!$user) return;
        try { $user->notify(new self($type, $title, $body, $url, $action, $category, $meta, $lines)); }
        catch (\Throwable $e) { report($e); }
    }
}
