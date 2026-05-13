<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('video_url');                      // R2/S3 original
            $table->string('hls_url')->nullable();            // HLS stream URL
            $table->string('thumbnail_url')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->string('resolution')->nullable();         // "1080x1920"
            $table->enum('status', [
                'pending',       // just uploaded
                'processing',    // ffmpeg + AI running
                'active',        // live on feed
                'failed',        // processing error
                'archived',
            ])->default('pending');
            $table->text('captions')->nullable();             // Whisper transcript
            $table->json('caption_segments')->nullable();     // timestamped segments
            $table->json('keywords')->nullable();             // extracted by Whisper/GPT
            $table->json('hashtags')->nullable();             // ["#fashion","#lagos"]
            $table->boolean('is_for_sale')->default(false);   // has product tags?
            $table->unsignedBigInteger('views_count')->default(0);
            $table->unsignedBigInteger('likes_count')->default(0);
            $table->unsignedBigInteger('comments_count')->default(0);
            $table->unsignedBigInteger('shares_count')->default(0);
            $table->unsignedBigInteger('saves_count')->default(0);
            $table->decimal('completion_rate', 5, 2)->default(0); // avg % watched
            $table->timestamp('published_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'published_at']);
        });

        // pgvector for semantic video feed (1024-dim)
        // DB::statement('ALTER TABLE videos ADD COLUMN embedding vector(1024)');
        // DB::statement('CREATE INDEX videos_embedding_idx ON videos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)');

        // Products tagged inside a video (the TikTok shop mechanic)
        Schema::create('video_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('pin_x', 5, 2)->nullable();       // % from left (0-100)
            $table->decimal('pin_y', 5, 2)->nullable();       // % from top  (0-100)
            $table->unsignedInteger('pin_timestamp')->nullable(); // seconds into video
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['video_id', 'product_id']);
            $table->index('product_id');
        });

        // Likes
        Schema::create('video_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'video_id']);
            $table->index('video_id');
        });

        // Comments
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
            $table->text('body');
            $table->unsignedBigInteger('likes_count')->default(0);
            $table->boolean('is_pinned')->default(false);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['video_id', 'created_at']);
        });

        // Video saves
        Schema::create('video_saves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'video_id']);
        });

        // Watch history (for "For You" feed personalization)
        Schema::create('video_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('session_id')->nullable();          // for guests
            $table->decimal('watch_percent', 5, 2)->default(0);
            $table->unsignedInteger('watch_seconds')->default(0);
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['video_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('video_views');
        Schema::dropIfExists('video_saves');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('video_likes');
        Schema::dropIfExists('video_products');
        Schema::dropIfExists('videos');
    }
};
