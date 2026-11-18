<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
    public function up(): void
    {
        Schema::table('videos', function (Blueprint $t) {
            if (!Schema::hasColumn('videos', 'photo_sound')) $t->json('photo_sound')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('videos', fn (Blueprint $t) => $t->dropColumn('photo_sound'));
    }
};
