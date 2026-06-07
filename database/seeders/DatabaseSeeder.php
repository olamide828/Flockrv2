<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {

        // Seed categories
        $this->call([
            CategorySeeder::class,
        ]);
        
        
        // Admin user
        $this->call([
            AdminSeeder::class,
        ]);
    }
}
