<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewOrderNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order) {}

    public function via($notifiable): array
    {
        return !empty($notifiable->email) ? ['mail', 'database'] : ['database'];
    }

    public function toMail($notifiable): MailMessage
    {
        $addr = $this->order->shipping_address ?? [];
        return (new MailMessage)
            ->subject("New order {$this->order->reference} 🎉")
            ->greeting('Hi ' . ($notifiable->name ?: 'there') . ',')
            ->line("You have a new order from {$this->order->buyer->name}.")
            ->line('Deliver to: ' . ($addr['city'] ?? 'N/A') . ', ' . ($addr['state'] ?? 'N/A'))
            ->line('Order total: ₦' . number_format((float) $this->order->total, 0))
            ->action('Open order', url("/orders/{$this->order->id}"))
            ->line('Pack it up and get it moving — buyers love fast shipping.');
    }

    public function toDatabase($notifiable): array
    {
        $addr = $this->order->shipping_address ?? [];
        $city  = $addr['city']  ?? 'N/A';
        $state = $addr['state'] ?? 'N/A';

        return [
            'type'     => 'new_order',
            'category' => 'shop',
            'title'    => 'New Order!',
            'body'     => "New order #{$this->order->reference} from {$this->order->buyer->name}. Deliver to: {$city}, {$state}.",
            'url'      => "/orders/{$this->order->id}",
            'image'    => null,
            'meta'     => [
                'order_id'  => $this->order->id,
                'reference' => $this->order->reference,
                'total'     => $this->order->total,
            ],
        ];
    }
}