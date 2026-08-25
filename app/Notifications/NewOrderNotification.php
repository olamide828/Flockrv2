<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewOrderNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order) {}

    public function via($notifiable): array
    {
        return ['database'];
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