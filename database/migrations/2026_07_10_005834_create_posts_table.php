<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            // room_id = null  →  General Feed (global timeline)
            // room_id = X     →  belongs to that room
            $table->text('content');
            $table->string('media_url')->nullable();      // image/video URL
            $table->string('media_type')->nullable();     // image | video
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('comments_count')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['room_id', 'created_at']);     // feed queries
            $table->index(['user_id', 'created_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('posts'); }
};
