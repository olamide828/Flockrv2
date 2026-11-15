<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * "Back in stock". $audience = 'wishlist' (user saved this product) or 'follower' (follows the seller).
 */
class ProductRestockedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Product $product, public int $stock, public string $audience = 'follower') {}

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
        $p      = $this->product;
        $seller = $p->seller;
        $wish   = $this->audience === 'wishlist';

        return [
            'type'          => 'product_restocked',
            'audience'      => $this->audience,
            'title'         => $wish ? 'Your saved item is back!' : 'Restocked',
            'message'       => $wish
                ? "{$p->name} is back in stock — only {$this->stock} available. Grab it before it sells out again."
                : ($seller?->name ?? 'A seller you follow') . " restocked {$p->name}.",
            'product_id'    => $p->id,
            'product_slug'  => $p->slug,
            'product_name'  => $p->name,
            'product_image' => $p->primary_image,
            'price'         => (float) $p->price,
            'stock'         => $this->stock,
            'seller_id'     => $seller?->id,
            'seller_name'   => $seller?->name,
            'seller_username' => $seller?->username,
            'url'           => '/@' . ($seller?->username ?? '') . '/products/' . $p->slug,
        ];
    }
}
