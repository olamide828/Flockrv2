<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderStatusNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Order  $order,
        public string $title,
        public string $body,
    ) {}

    public function via($notifiable): array
    {
        return !empty($notifiable->email) ? ['mail', 'database'] : ['database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("{$this->title} — order {$this->order->reference}")
            ->greeting('Hi ' . ($notifiable->name ?: 'there') . ',')
            ->line($this->body)
            ->line("Order: {$this->order->reference}")
            ->action('View order', url("/orders/{$this->order->id}"))
            ->line('Thanks for using Flockr.');
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'order_status',
            'category' => 'shop',
            'title'    => $this->title,
            'body'     => $this->body,
            'url'      => "/orders/{$this->order->id}",
            'image'    => null,
            'meta'     => [
                'order_id'  => $this->order->id,
                'reference' => $this->order->reference,
                'status'    => $this->order->status,
            ],
        ];
    }
}