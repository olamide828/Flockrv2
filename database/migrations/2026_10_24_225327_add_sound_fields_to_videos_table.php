<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('videos', function (Blueprint $t) {
            $t->foreignId('sound_id')->nullable()->after('text_overlays')->constrained('sounds')->nullOnDelete();
            $t->boolean('allow_sound_reuse')->default(true)->after('sound_id');
        });

        Schema::table('sounds', function (Blueprint $t) {
            $t->foreign('video_id')->references('id')->on('videos')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sounds', fn (Blueprint $t) => $t->dropForeign(['video_id']));
        Schema::table('videos', function (Blueprint $t) {
            $t->dropConstrainedForeignId('sound_id');
            $t->dropColumn('allow_sound_reuse');
        });
    }
};
