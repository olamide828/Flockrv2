<?php

namespace App\Services;

use App\Models\Product;
use App\Notifications\ProductRestockedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RestockService
{
    /** Don't re-announce the same product more than once in this window (stops spam if a seller toggles stock). */
    const COOLDOWN_HOURS = 6;

    /**
     * Add stock to a product. Announces ONLY when it was sold out before (stock was 0).
     * Returns ['stock' => int, 'announced' => bool, 'notified' => int].
     */
    public function restock(Product $product, int $quantity): array
    {
        $result = DB::transaction(function () use ($product, $quantity) {
            $fresh  = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();
            $before = (int) $fresh->stock_quantity;
            $fresh->stock_quantity = $before + $quantity;
            if ($fresh->status === 'archived' && $before <= 0) $fresh->status = 'active';
            $fresh->save();
            return [$fresh, $before];
        });

        [$fresh, $before] = $result;
        $notified = 0;
        $announced = false;
        if ($before <= 0) {
            $notified  = $this->announce($fresh);
            $announced = true;
        }
        return ['stock' => (int) $fresh->stock_quantity, 'announced' => $announced, 'notified' => $notified];
    }

    /** Called by restock() and by ProductController::update() when stock goes 0 → positive. Returns people notified. */
    public function announce(Product $product): int
    {
        if ($product->status !== 'active' || (int) $product->stock_quantity <= 0) return 0;

        if ($product->restocked_at && $product->restocked_at->gt(now()->subHours(self::COOLDOWN_HOURS))) {
            return 0;
        }
        $product->forceFill(['restocked_at' => now()])->saveQuietly();

        $stock    = (int) $product->stock_quantity;
        $sellerId = $product->seller_id;
        $count    = 0;

        // 1) people who saved it → "your saved item is back" (also drives the animated modal)
        $savedIds = DB::table('product_saves')->where('product_id', $product->id)->pluck('user_id')->unique()->all();
        foreach (array_chunk($savedIds, 200) as $chunk) {
            \App\Models\User::whereIn('id', $chunk)->where('id', '!=', $sellerId)->get()->each(function ($u) use ($product, $stock, &$count) {
                $this->safeNotify($u, new ProductRestockedNotification($product, $stock, 'wishlist'));
                $count++;
            });
        }

        // 2) seller's followers who did NOT save it
        $product->seller?->followers()
            ->whereNotIn('users.id', $savedIds ?: [0])
            ->chunkById(200, function ($followers) use ($product, $stock, &$count) {
                foreach ($followers as $f) {
                    $this->safeNotify($f, new ProductRestockedNotification($product, $stock, 'follower'));
                    $count++;
                }
            }, 'users.id', 'id');

        return $count;
    }

    private function safeNotify($user, $notification): void
    {
        try { $user->notify($notification); }
        catch (\Throwable $e) { Log::warning('restock notify failed: ' . $e->getMessage()); }
    }
}
