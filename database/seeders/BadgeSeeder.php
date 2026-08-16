<?php
namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

class BadgeSeeder extends Seeder
{
    public function run(): void
    {
        $badges = [
            // ── Seller badges ──────────────────────────────────────────────
            ['key' => 'founding_member',    'label' => 'Founding Member',    'description' => 'One of the first to test Flockr', 'requirement_label' => 'Awarded by Flockr to early testers', 'progress_metric' => null, 'progress_target' => null, 'audience' => 'both', 'image_path' => '/images/badges/founding-member.png'],
            ['key' => 'first_sale',         'label' => 'First Sale',         'description' => 'Made their first sale',            'requirement_label' => 'Complete 1 sale',   'progress_metric' => 'seller_orders', 'progress_target' => 1,   'audience' => 'seller', 'image_path' => '/images/badges/first-sale.png'],
            ['key' => 'ten_sales',          'label' => '10 Sales',           'description' => 'Sold 10 items',                    'requirement_label' => 'Complete 10 sales', 'progress_metric' => 'seller_orders', 'progress_target' => 10,  'audience' => 'seller', 'image_path' => '/images/badges/ten-sales.png'],
            ['key' => 'viral_debut',        'label' => 'Viral Debut',        'description' => 'A video crossed 1,000 views',      'requirement_label' => 'Get 1,000 views on a single video', 'progress_metric' => 'max_video_views', 'progress_target' => 1000, 'audience' => 'seller', 'image_path' => '/images/badges/viral-debut.png'],
            ['key' => 'consistent',         'label' => 'Consistent Creator', 'description' => '3-day upload streak',              'requirement_label' => 'Upload videos 3 days in a row', 'progress_metric' => 'upload_streak', 'progress_target' => 3, 'audience' => 'seller', 'image_path' => '/images/badges/consistent.png'],
            ['key' => 'hundred_followers',  'label' => '100 Followers',      'description' => 'Reached 100 followers',            'requirement_label' => 'Reach 100 followers', 'progress_metric' => 'followers_count', 'progress_target' => 100, 'audience' => 'seller', 'image_path' => '/images/badges/hundred-followers.png'],
            ['key' => 'pro_member',         'label' => 'Pro Member',         'description' => 'Subscribed to Flockr Pro',         'requirement_label' => 'Subscribe to Flockr Pro', 'progress_metric' => null, 'progress_target' => null, 'audience' => 'seller', 'image_path' => '/images/badges/pro-member.png'],

            // ── Buyer badges ───────────────────────────────────────────────
            ['key' => 'first_purchase',     'label' => 'First Purchase',     'description' => 'Made their first order on Flockr', 'requirement_label' => 'Complete 1 purchase', 'progress_metric' => 'buyer_orders', 'progress_target' => 1, 'audience' => 'buyer', 'image_path' => '/images/badges/first-purchase.png'],
            ['key' => 'five_purchases',     'label' => 'Regular Shopper',    'description' => 'Completed 5 orders',               'requirement_label' => 'Complete 5 purchases', 'progress_metric' => 'buyer_orders', 'progress_target' => 5, 'audience' => 'buyer', 'image_path' => '/images/badges/five-purchases.png'],
            ['key' => 'wishlist_starter',   'label' => 'Wishlist Starter',   'description' => 'Saved their first product',        'requirement_label' => 'Save a product to your wishlist', 'progress_metric' => 'saved_products', 'progress_target' => 1, 'audience' => 'buyer', 'image_path' => '/images/badges/wishlist-starter.png'],
            ['key' => 'loyal_shopper',      'label' => 'Loyal Shopper',      'description' => '3-day visit streak',               'requirement_label' => 'Visit Flockr 3 days in a row', 'progress_metric' => 'visit_streak', 'progress_target' => 3, 'audience' => 'buyer', 'image_path' => '/images/badges/loyal-shopper.png'],
        ];

        foreach ($badges as $b) {
            Badge::updateOrCreate(['key' => $b['key']], $b);
        }
    }
}