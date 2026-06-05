<?php
namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewOrderNotification extends Notification
{
    use Queueable;
    public function __construct(public Order $order) {}
    public function via($notifiable): array { return ['database']; }
    public function toDatabase($notifiable): array
    {
        return [
            'type'    => 'new_order',
            'category' => 'shop',
            'title'   => 'New Order!',
            'body'    => "You have a new order #{$this->order->reference}",
            'url'     => "/orders/{$this->order->id}",
            'image'   => null,
            'meta'    => ['order_id' => $this->order->id, 'reference' => $this->order->reference, 'total' => $this->order->total],
        ];
    }
}