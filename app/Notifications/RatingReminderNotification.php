<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RatingReminderNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'rating_reminder',
            'category' => 'shop',
            'title'    => 'How was your order?',
            'body'     => "Leave a review for order #{$this->order->reference} and earn a ₦200 coupon!",
            'url'      => "/orders/{$this->order->id}",
            'image'    => null,
            'meta'     => [
                'order_id'  => $this->order->id,
                'reference' => $this->order->reference,
            ],
        ];
    }
}