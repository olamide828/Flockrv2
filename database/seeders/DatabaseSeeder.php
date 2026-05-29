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
        $this->call([
            CategorySeeder::class,
        ]);
        
        
        // Admin user
        User::firstOrCreate(['email'=>'admin@flockr.ng'], [
            'name'        => 'Flockr Admin',
            'username'    => 'admin',
            'password'    => Hash::make('Admin123!'),
            'role'        => 'admin',
            'is_verified' => true,
        ]);
    }
}
