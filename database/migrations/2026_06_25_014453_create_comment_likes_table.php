<?php

// ─────────────────────────────────────────────────────────────────────────────
// Run: php artisan make:migration create_comment_likes_table
// Paste this into the generated file:
// ─────────────────────────────────────────────────────────────────────────────

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('comment_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['comment_id', 'user_id']); // one like per user per comment
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_likes');
    }
};