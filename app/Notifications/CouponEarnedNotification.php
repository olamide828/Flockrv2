<?php

namespace App\Notifications;

use App\Models\Coupon;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CouponEarnedNotification extends Notification
{
    use Queueable;

    public function __construct(public Coupon $coupon) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'coupon_earned',
            'category' => 'shop',
            'title'    => '🎉 You earned a ₦200 coupon!',
            'body'     => "Thanks for your review! Use code {$this->coupon->code} on your next order of ₦2,000+.",
            'url'      => '/shop',
            'image'    => null,
            'meta'     => [
                'coupon_code' => $this->coupon->code,
                'amount'      => $this->coupon->amount,
                'min_order'   => $this->coupon->min_order,
                'expires_at'  => $this->coupon->expires_at?->toDateString(),
            ],
        ];
    }
}