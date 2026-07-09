<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
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
        return ['database'];
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