<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Deliberately a flag, not a new 'role' enum value — avoids any
            // risk of colliding with a CHECK constraint on the role column
            // (several other status columns in this app use them) without
            // needing to inspect/alter it.
            $table->boolean('is_flockr_support')->default(false)->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_flockr_support');
        });
    }
};