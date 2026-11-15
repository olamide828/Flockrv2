<?php

namespace App\Services;

use App\Exceptions\OutOfStockException;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

/**
 * Holds stock for a pending order for a short time so two buyers cannot both pay for the last item.
 * Real stock is still only decremented when the order is paid (Order::markAsPaid) — a reservation
 * just makes other buyers' "available" smaller until it is paid, cancelled or expires.
 * No cron needed: expired holds are simply ignored.
 */
class StockReservationService
{
    public const HOLD_MINUTES = 30;

    /** Units a buyer could still check out right now (excluding holds from $exceptOrderId). */
    public function available(int $productId, ?int $exceptOrderId = null): int
    {
        $stock = (int) Product::whereKey($productId)->value('stock_quantity');
        $held = (int) DB::table('stock_reservations')
            ->where('product_id', $productId)
            ->where('expires_at', '>', now())
            ->when($exceptOrderId, fn ($q) => $q->where('order_id', '!=', $exceptOrderId))
            ->sum('quantity');

        return max(0, $stock - $held);
    }

    /** Call INSIDE the checkout DB transaction. Locks the product row so concurrent buyers queue up. */
    public function reserve(Order $order, int $productId, int $qty): void
    {
        $product = Product::whereKey($productId)->lockForUpdate()->first();
        if (!$product) {
            throw new OutOfStockException('This product is no longer available.');
        }

        $available = $this->available($productId, $order->id);
        if ($available < $qty) {
            throw new OutOfStockException(
                $available <= 0
                    ? "\"{$product->name}\" just sold out."
                    : "Only {$available} of \"{$product->name}\" left — someone else is checking out with it."
            );
        }

        DB::table('stock_reservations')->updateOrInsert(
            ['order_id' => $order->id, 'product_id' => $productId],
            ['quantity' => $qty, 'expires_at' => now()->addMinutes(self::HOLD_MINUTES), 'created_at' => now(), 'updated_at' => now()]
        );
    }

    /** Re-hold stock for every item of a pending order (used when the buyer resumes payment). */
    public function ensureForOrder(Order $order): void
    {
        DB::transaction(function () use ($order) {
            foreach ($order->items as $item) {
                $this->reserve($order, (int) $item->product_id, (int) $item->quantity);
            }
        });
    }

    public function release(int $orderId): void
    {
        DB::table('stock_reservations')->where('order_id', $orderId)->delete();
    }
}
