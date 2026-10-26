<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sounds', function (Blueprint $t) {
            // Sounds a seller records / uploads: private ("My sounds") unless they choose to share it
            $t->boolean('is_public')->default(false)->after('is_active');
        });

        Schema::table('videos', function (Blueprint $t) {
            // "Enhance" look chosen by the creator (applied on playback and in downloads, the file itself is untouched)
            $t->boolean('enhance')->default(false)->after('allow_sound_reuse');
        });
    }

    public function down(): void
    {
        Schema::table('sounds', fn (Blueprint $t) => $t->dropColumn('is_public'));
        Schema::table('videos', fn (Blueprint $t) => $t->dropColumn('enhance'));
    }
};
