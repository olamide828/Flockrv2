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

    /** Deep link to the product's Reviews tab (falls back to the order page). */
    private function reviewUrl(): string
    {
        try {
            $item = $this->order->items()->with('product.seller:id,username')->first();
            $p = $item?->product;
            if ($p && $p->seller?->username) {
                return "/@{$p->seller->username}/products/{$p->slug}?tab=reviews&order={$this->order->id}";
            }
        } catch (\Throwable) {}
        return "/orders/{$this->order->id}";
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'rating_reminder',
            'category' => 'shop',
            'title'    => 'How was your order?',
            'body'     => "Leave a review for order #{$this->order->reference} and earn a ₦200 coupon!",
            'url'      => $this->reviewUrl(),
            'image'    => null,
            'meta'     => [
                'order_id'  => $this->order->id,
                'reference' => $this->order->reference,
            ],
        ];
    }
}