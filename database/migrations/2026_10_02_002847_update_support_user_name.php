<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        $password = env('SUPPORT_USER_PASSWORD');

        if (empty($password)) {
            throw new \Exception('SUPPORT_USER_PASSWORD environment variable is not set.');
        }

        DB::table('users')
            ->where('is_flockr_support', true)
            ->update([
                'name' => 'Chirp',
                'username' => 'chirp',
                'password' => Hash::make($password),
            ]);
    }

    public function down(): void
    {
        
    }
};