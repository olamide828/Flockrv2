<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('post_polls')) {
            Schema::create('post_polls', function (Blueprint $t) {
                $t->id();
                $t->foreignId('post_id')->unique()->constrained('posts')->cascadeOnDelete();
                $t->boolean('allow_multiple')->default(false);
                $t->timestamp('ends_at')->nullable();
                $t->unsignedInteger('total_votes')->default(0);  
                $t->timestamps();
            });
        }
        if (!Schema::hasTable('post_poll_options')) {
            Schema::create('post_poll_options', function (Blueprint $t) {
                $t->id();
                $t->foreignId('poll_id')->constrained('post_polls')->cascadeOnDelete();
                $t->string('text', 80);
                $t->unsignedTinyInteger('position')->default(0);
                $t->unsignedInteger('votes_count')->default(0);
                $t->timestamps();
            });
        }
        if (!Schema::hasTable('post_poll_votes')) {
            Schema::create('post_poll_votes', function (Blueprint $t) {
                $t->id();
                $t->foreignId('poll_id')->constrained('post_polls')->cascadeOnDelete();
                $t->foreignId('option_id')->constrained('post_poll_options')->cascadeOnDelete();
                $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $t->timestamps();
                $t->unique(['poll_id', 'option_id', 'user_id']);   
                $t->index(['poll_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('post_poll_votes');
        Schema::dropIfExists('post_poll_options');
        Schema::dropIfExists('post_polls');
    }
};
