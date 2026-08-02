<?php

namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

class BadgeSeeder extends Seeder
{
    public function run(): void
    {
        $badges = [
            ['key' => 'founding_member', 'label' => 'Founding Member', 'description' => 'One of the first to test Flockr', 'image_path' => '/images/badges/flockr_logo_orange.png'],
            ['key' => 'first_sale', 'label' => 'First Sale', 'description' => 'Made their first sale', 'image_path' => '/images/badges/first-sale.png'],
            ['key' => 'ten_sales', 'label' => '10 Sales', 'description' => 'Sold 10 items', 'image_path' => '/images/badges/ten-sales.png'],
            ['key' => 'viral_debut', 'label' => 'Viral Debut', 'description' => 'A video crossed 1,000 views', 'image_path' => '/images/badges/viral-debut.png'],
            ['key' => 'consistent', 'label' => 'Consistent Creator', 'description' => '3-day upload streak', 'image_path' => '/images/badges/consistent.png'],
            ['key' => 'hundred_followers', 'label' => '100 Followers', 'description' => 'Reached 100 followers', 'image_path' => '/images/badges/hundred-followers.png'],
        ];
        foreach ($badges as $b) {
            Badge::updateOrCreate(['key' => $b['key']], $b);
        }
    }
}