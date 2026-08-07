<?php

namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

class BadgeSeeder extends Seeder
{
    public function run(): void
    {
        $badges = [
            ['key' => 'founding_member', 'label' => 'Founding Member', 'description' => 'One of the first to test Flockr', 'image_path' => '/images/badges/founding-member.png'],
            ['key' => 'first_sale', 'label' => 'First Sale', 'description' => 'Made their first sale', 'image_path' => '/images/badges/first-sale.png'],
            ['key' => 'ten_sales', 'label' => '10 Sales', 'description' => 'Sold 10 items', 'image_path' => '/images/badges/ten-sales.png'],
            ['key' => 'viral_debut', 'label' => 'Viral Debut', 'description' => 'A video crossed 1,000 views', 'image_path' => '/images/badges/viral-debut.png'],
            ['key' => 'consistent', 'label' => 'Consistent Creator', 'description' => '3-day upload streak', 'image_path' => '/images/badges/consistent.png'],
            ['key' => 'hundred_followers', 'label' => '100 Followers', 'description' => 'Reached 100 followers', 'image_path' => '/images/badges/hundred-followers.png'],
            ['key' => 'first_purchase',   'label' => 'First Purchase',    'description' => 'Made their first order on Flockr',      'image_path' => '/images/badges/first-purchase.png'],
            ['key' => 'five_purchases',   'label' => 'Regular Shopper',   'description' => 'Completed 5 orders',                    'image_path' => '/images/badges/five-purchases.png'],
            ['key' => 'wishlist_starter', 'label' => 'Wishlist Starter',  'description' => 'Saved their first product',             'image_path' => '/images/badges/wishlist-starter.png'],
            ['key' => 'loyal_shopper',    'label' => 'Loyal Shopper',     'description' => '3-day visit streak',                    'image_path' => '/images/badges/loyal-shopper.png'],
        ];
        foreach ($badges as $b) {
            Badge::updateOrCreate(['key' => $b['key']], $b);
        }
    }
}