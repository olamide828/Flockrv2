<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('videos', 'is_featured')) {
            Schema::table('videos', function (Blueprint $t) {
                $t->boolean('is_featured')->default(false)->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('videos', 'is_featured')) {
            Schema::table('videos', fn (Blueprint $t) => $t->dropColumn('is_featured'));
        }
    }
};
