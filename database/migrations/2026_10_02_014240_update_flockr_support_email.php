<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('is_flockr_support', true)
            ->update([
                'email' => 'new-support-email@flockr.com',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('users')
            ->where('is_flockr_support', true)
            ->update([
                'email' => 'chirp@flockr.com',
                'updated_at' => now(),
            ]);
    }
};