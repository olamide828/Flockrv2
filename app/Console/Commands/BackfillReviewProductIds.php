<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillReviewProductIds extends Command
{
    protected $signature   = 'reviews:backfill';
    protected $description = 'Backfill product_id on reviews from order_items';

    public function handle(): void
    {
        $reviews = DB::table('reviews')->whereNull('product_id')->get();
        $this->info("Found {$reviews->count()} reviews to backfill");

        foreach ($reviews as $review) {
            $productId = DB::table('order_items')
                ->where('order_id', $review->order_id)
                ->value('product_id');

            if ($productId) {
                DB::table('reviews')
                    ->where('id', $review->id)
                    ->update(['product_id' => $productId]);

                DB::statement(
                    'UPDATE products SET
                        avg_rating    = (SELECT ROUND(AVG(rating)::numeric,2) FROM reviews WHERE product_id=?),
                        total_reviews = (SELECT COUNT(*) FROM reviews WHERE product_id=?)
                    WHERE id=?',
                    [$productId, $productId, $productId]
                );

                $this->line("Review {$review->id} → product {$productId}");
            } else {
                $this->warn("Review {$review->id} → no order item found");
            }
        }

        // Also update seller ratings
        DB::statement("
            UPDATE users SET
                avg_rating    = sub.avg,
                total_reviews = sub.cnt
            FROM (
                SELECT seller_id, ROUND(AVG(rating)::numeric,2) as avg, COUNT(*) as cnt
                FROM reviews
                GROUP BY seller_id
            ) sub
            WHERE users.id = sub.seller_id
        ");

        $this->info('Done. Seller ratings also updated.');
    }
}