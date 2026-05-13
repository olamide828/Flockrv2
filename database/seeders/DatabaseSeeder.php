<?php
namespace Database\Seeders;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Seed categories
        $cats = [
            ['name'=>'Fashion','slug'=>'fashion','icon'=>'👗'],
            ['name'=>'Beauty','slug'=>'beauty','icon'=>'💄'],
            ['name'=>'Electronics','slug'=>'electronics','icon'=>'📱'],
            ['name'=>'Food & Drinks','slug'=>'food','icon'=>'🍲'],
            ['name'=>'Home & Living','slug'=>'home','icon'=>'🏠'],
            ['name'=>'Health','slug'=>'health','icon'=>'💊'],
            ['name'=>'Accessories','slug'=>'accessories','icon'=>'👜'],
            ['name'=>'Kids','slug'=>'kids','icon'=>'🧸'],
        ];
        foreach ($cats as $cat) {
            Category::firstOrCreate(['slug'=>$cat['slug']], array_merge($cat, ['is_active'=>true]));
        }

        // Admin user
        User::firstOrCreate(['email'=>'admin@flockr.ng'], [
            'name'        => 'Flockr Admin',
            'username'    => 'admin',
            'password'    => Hash::make('password'),
            'role'        => 'admin',
            'is_verified' => true,
        ]);
    }
}
