<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
       User::firstOrCreate(['email'=>'admin@flockr.ng'], [
            'name'        => 'Flockr Admin',
            'username'    => 'admin',
            'password'    => Hash::make('Admin123!'),
            'role'        => 'admin',
            'is_verified' => true,
        ]);
    }
}