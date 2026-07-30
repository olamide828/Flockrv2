<?php

namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

class BadgeSeeder extends Seeder
{
    public function run(): void
    {
        $badges = [
            ['key' => 'founding_member', 'label' => 'Founding Member', 'description' => 'One of the first to test Flockr', 'icon' => 'RiRocketLine',       'color' => '#FF6B35'],
            ['key' => 'first_sale',      'label' => 'First Sale',      'description' => 'Made their first sale',         'icon' => 'RiShoppingBagLine',    'color' => '#10B981'],
            ['key' => 'ten_sales',       'label' => '10 Sales',        'description' => 'Sold 10 items',                 'icon' => 'RiMedalLine',          'color' => '#3B82F6'],
            ['key' => 'viral_debut',     'label' => 'Viral Debut',     'description' => 'A video crossed 1,000 views',   'icon' => 'RiFireLine',           'color' => '#EF4444'],
            ['key' => 'consistent',      'label' => 'Consistent Creator', 'description' => '3-day upload streak',        'icon' => 'RiCalendarCheckLine',  'color' => '#8B5CF6'],
            ['key' => 'hundred_followers','label' => '100 Followers',  'description' => 'Reached 100 followers',         'icon' => 'RiTeamLine',           'color' => '#EC4899'],
            ['key' => 'pro_member',      'label' => 'Pro Member',      'description' => 'Subscribed to Flockr Pro',      'icon' => 'RiVipCrownLine',       'color' => '#FBBF24'],
        ];
        foreach ($badges as $b) {
            Badge::updateOrCreate(['key' => $b['key']], $b);
        }
    }
}