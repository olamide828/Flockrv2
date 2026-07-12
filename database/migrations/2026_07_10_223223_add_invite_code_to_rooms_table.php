<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->string('invite_code', 12)->nullable()->unique()->after('is_private');
        });

        // Generate invite codes for existing rooms
        \App\Models\Room::whereNull('invite_code')->get()->each(function ($room) {
            $room->update(['invite_code' => strtoupper(\Illuminate\Support\Str::random(8))]);
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn('invite_code');
        });
    }
};
