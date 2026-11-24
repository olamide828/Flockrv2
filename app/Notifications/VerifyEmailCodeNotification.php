<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailCodeNotification extends Notification
{
    public function __construct(private string $code, private int $minutes = 10) {}

    public function via($notifiable): array { return ['mail']; }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("{$this->code} is your Flockr verification code")
            ->greeting("Hi {$notifiable->name},")
            ->line('Use this code to verify your email address:')
            ->line("**{$this->code}**")
            ->line("It expires in {$this->minutes} minutes. If you didn't create a Flockr account, you can ignore this email.");
    }
}
