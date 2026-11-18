<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
    public function up(): void
    {
        Schema::table('events', function (Blueprint $t) {
            if (!Schema::hasColumn('events', 'badge_image')) $t->string('badge_image', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('events', fn (Blueprint $t) => $t->dropColumn('badge_image'));
    }
};
