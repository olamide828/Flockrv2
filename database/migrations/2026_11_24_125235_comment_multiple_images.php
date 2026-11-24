<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('comments') && !Schema::hasColumn('comments', 'images')) {
            Schema::table('comments', fn (Blueprint $t) => $t->json('images')->nullable());
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('comments', 'images')) {
            Schema::table('comments', fn (Blueprint $t) => $t->dropColumn('images'));
        }
    }
};
