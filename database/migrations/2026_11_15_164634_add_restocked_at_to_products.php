<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $t) {
            if (!Schema::hasColumn('products', 'restocked_at')) {
                $t->timestamp('restocked_at')->nullable()->index();
            }
        });
    }
    public function down(): void
    {
        Schema::table('products', fn (Blueprint $t) => $t->dropColumn('restocked_at'));
    }
};
