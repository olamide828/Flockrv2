<?php

namespace App\Notifications;

use App\Models\Payout;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PayoutProcessedNotification extends Notification
{
    use Queueable;

    public function __construct(public Payout $payout) {}

    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Payout Has Been Processed 💸')
            ->greeting("Hi {$notifiable->name}!")
            ->line("Your payout of ₦" . number_format($this->payout->amount, 2) . " has been successfully processed.")
            ->line("The funds will arrive in your bank account within 1–3 business days.")
            ->line("**Bank:** {$notifiable->bank_name}")
            ->line("**Account:** **** {$notifiable->account_last4}")
            ->line("**Reference:** FLK-PAY-{$this->payout->id}")
            ->action('View Dashboard', url('/seller/dashboard'))
            ->line('Thank you for selling on Flockr!');
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'payout_processed',
            'category' => 'shop',
            'title'    => 'Payout Processed',
            'body'     => "₦" . number_format($this->payout->amount, 2) . " has been sent to your bank account.",
            'url'      => '/seller/dashboard',
            'image'    => null,
            'meta'     => ['payout_id' => $this->payout->id, 'amount' => $this->payout->amount],
        ];
    }
}