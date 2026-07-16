<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('post_comments', function (Blueprint $table) {
            // likes_count already exists on this table per your original
            // migration — nothing to add there.
        });

        Schema::create('post_comment_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_comment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['post_comment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_comment_likes');
    }
};