<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sounds', function (Blueprint $t) {
            // id of the track at an outside provider (Epidemic Sound), so a track is only downloaded once
            $t->string('external_id', 64)->nullable()->after('source')->index();
        });
    }

    public function down(): void
    {
        Schema::table('sounds', fn (Blueprint $t) => $t->dropColumn('external_id'));
    }
};
