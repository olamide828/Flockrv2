<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@flockr.com'],
            [
                'name'              => 'Super Admin',
                'username'          => 'superadmin',
                'email'             => 'admin@flockr.com',
                'password'          => Hash::make('Admin@1234!'),
                'role'              => 'admin',
                'email_verified_at' => now(),
                'is_active'         => true,
            ]
        );
    }
}