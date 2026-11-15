<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/** Tells the seller their product just sold out and nudges them to restock. */
class ProductSoldOutNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Product $product) {}

    public function via($notifiable): array { return ['database']; }

    public function toDatabase($notifiable): array
    {
        $d = $this->payload($notifiable);
        // Fields your Notifications page + NotificationController already read
        return $d + [
            'category' => 'shop',
            'body'     => $d['message'] ?? ($d['title'] ?? ''),
            'image'    => $d['product_image'] ?? null,
            'meta'     => ['product_id' => $d['product_id'] ?? null],
        ];
    }

    public function toArray($notifiable): array { return $this->toDatabase($notifiable); }

    private function payload($notifiable): array
    {
        $p = $this->product;
        return [
            'type'          => 'product_sold_out',
            'title'         => 'Sold out',
            'message'       => "{$p->name} just sold out. Restock now so buyers don't lose interest.",
            'product_id'    => $p->id,
            'product_name'  => $p->name,
            'product_image' => $p->primary_image,
            'url'           => '/seller/products/' . $p->id . '/edit',
        ];
    }
}
