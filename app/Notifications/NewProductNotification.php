<?php
namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewProductNotification extends Notification
{
    use Queueable;
    public function __construct(public Product $product) {}
    public function via($notifiable): array { return ['database']; }
    public function toDatabase($notifiable): array
    {
        return [
            'type'     => 'new_product',
            'category' => 'shop',
            'title'    => 'New Product',
            'body'     => "@{$this->product->seller->username} listed: {$this->product->name}",
            'url'      => "/@{$this->product->seller->username}/products/{$this->product->slug}",
            'image'    => $this->product->seller->avatar_url,
            'meta'     => ['product_id' => $this->product->id, 'seller_id' => $this->product->seller_id],
        ];
    }
}