<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('badges', function (Blueprint $table) {
            // Make color optional:
            $table->string('color')->nullable()->change();
            
            // OR if you want to drop the column completely:
            // $table->dropColumn('color');
        });
    }

    public function down(): void
    {
        Schema::table('badges', function (Blueprint $table) {
            $table->string('color')->nullable(false)->change();
            // OR if dropped:
            // $table->string('color');
        });
    }
};