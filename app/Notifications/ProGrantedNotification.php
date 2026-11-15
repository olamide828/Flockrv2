<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

/** Sent when an admin grants (or extends) Flockr Pro for a user. Email + in-app notification. */
class ProGrantedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $plan,          // monthly | yearly
        public Carbon $expiresAt,
        public bool $extended = false,
        public ?string $note = null,
    ) {}

    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable): MailMessage
    {
        $fee = (int) config('flockr.pro_platform_fee_percent', 3);
        $mail = (new MailMessage)
            ->subject($this->extended ? 'Your Flockr Pro has been extended 🎉' : 'You now have Flockr Pro 🎉')
            ->greeting("Hi {$notifiable->name}!")
            ->line($this->extended
                ? 'Good news — we have added more time to your Flockr Pro.'
                : 'Good news — Flockr Pro has been activated on your account, on the house.')
            ->line("**Pro is active until:** {$this->expiresAt->toFormattedDateString()}")
            ->line("As a Pro seller you pay a lower {$fee}% commission on every sale, plus the other Pro perks.");

        if ($this->note) $mail->line($this->note);

        return $mail->action('Open my dashboard', url('/seller/dashboard'))->line('Thank you for selling on Flockr!');
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'pro_granted',
            'category' => 'shop',
            'title'    => $this->extended ? 'Flockr Pro extended' : 'You now have Flockr Pro',
            'body'     => "Active until {$this->expiresAt->toFormattedDateString()}.",
            'url'      => '/seller/dashboard',
            'image'    => null,
            'meta'     => ['plan' => $this->plan, 'expires_at' => $this->expiresAt->toIso8601String()],
        ];
    }
}
