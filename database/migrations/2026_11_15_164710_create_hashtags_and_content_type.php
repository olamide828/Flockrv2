<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('hashtags')) {
            Schema::create('hashtags', function (Blueprint $t) {
                $t->id();
                $t->string('tag', 60)->unique();          // lowercase, no '#'
                $t->unsignedInteger('videos_count')->default(0);
                $t->unsignedInteger('products_count')->default(0);
                $t->timestamp('last_used_at')->nullable();
                $t->timestamps();
                $t->index('videos_count');
                $t->index('products_count');
            });
        }

        Schema::table('videos', function (Blueprint $t) {
            if (!Schema::hasColumn('videos', 'content_type')) {
                // entertainment | haul | review | shopping — shopping = seller video with a product tagged
                $t->string('content_type', 20)->default('entertainment')->index();
            }
        });

        // existing videos that already have products tagged are shopping videos
        \Illuminate\Support\Facades\DB::table('videos')->where('is_for_sale', true)->update(['content_type' => 'shopping']);
    }

    public function down(): void
    {
        Schema::dropIfExists('hashtags');
        Schema::table('videos', fn (Blueprint $t) => $t->dropColumn('content_type'));
    }
};
