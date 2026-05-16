<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Fashion & Clothing',    'icon' => 'shirt',       'sort_order' => 1],
            ['name' => 'Beauty & Skincare',     'icon' => 'sparkles',    'sort_order' => 2],
            ['name' => 'Electronics & Gadgets', 'icon' => 'smartphone',  'sort_order' => 3],
            ['name' => 'Food & Drinks',         'icon' => 'restaurant',  'sort_order' => 4],
            ['name' => 'Home & Living',         'icon' => 'home',        'sort_order' => 5],
            ['name' => 'Health & Wellness',     'icon' => 'capsule',     'sort_order' => 6],
            ['name' => 'Accessories & Jewelry', 'icon' => 'handbag',     'sort_order' => 7],
            ['name' => 'Kids & Baby',           'icon' => 'bear',        'sort_order' => 8],
            ['name' => 'Books & Education',     'icon' => 'book',        'sort_order' => 9],
            ['name' => 'Gaming',                'icon' => 'gamepad',     'sort_order' => 10],
            ['name' => 'Auto Parts',            'icon' => 'car',         'sort_order' => 11],
            ['name' => 'Sports & Fitness',      'icon' => 'football',    'sort_order' => 12],
            ['name' => 'Organic & Natural',     'icon' => 'leaf',        'sort_order' => 13],
            ['name' => 'Art & Crafts',          'icon' => 'palette',     'sort_order' => 14],
            ['name' => 'Other',                 'icon' => 'more',        'sort_order' => 15],
        ];

        foreach ($categories as $cat) {
            DB::table('categories')->updateOrInsert(
                ['slug' => Str::slug($cat['name'])],
                [
                    'name'       => $cat['name'],
                    'slug'       => Str::slug($cat['name']),
                    'icon'       => $cat['icon'],
                    'is_active'  => true,
                    'sort_order' => $cat['sort_order'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}