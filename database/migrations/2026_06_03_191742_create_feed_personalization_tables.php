<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. user_interests ─────────────────────────────────────────────────
        Schema::create('user_interests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('session_id', 64)->nullable();
            $table->enum('type', ['category', 'hashtag', 'seller', 'product']);
            $table->unsignedBigInteger('ref_id')->nullable();
            $table->string('ref_key', 100)->nullable();
            $table->decimal('score', 8, 4)->default(0);
            $table->unsignedBigInteger('interaction_count')->default(0);
            $table->timestamp('last_interacted_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'type', 'score']);
            $table->index(['session_id', 'type', 'score']);
        });

        // ── 2. video_scores ───────────────────────────────────────────────────
        Schema::create('video_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('video_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('watch_through_rate', 5, 2)->default(0);
            $table->decimal('engagement_rate', 8, 4)->default(0);
            $table->decimal('save_rate', 8, 4)->default(0);
            $table->decimal('share_rate', 8, 4)->default(0);
            $table->decimal('purchase_rate', 8, 4)->default(0);
            $table->decimal('cart_rate', 8, 4)->default(0);
            $table->unsignedBigInteger('velocity_24h')->default(0);
            $table->decimal('quality_score', 6, 2)->default(0);
            $table->decimal('commerce_score', 6, 2)->default(0);
            $table->decimal('creator_score', 6, 2)->default(50);
            $table->timestamp('scored_at')->nullable();
            $table->timestamps();

            $table->index(['quality_score', 'commerce_score']);
            $table->index('velocity_24h');
        });

        // ── 3. feed_events ────────────────────────────────────────────────────
        Schema::create('feed_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('session_id', 64)->nullable();
            $table->foreignId('video_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('event', [
                'video_skip',
                'video_complete',
                'video_rewatch',
                'product_click',
                'product_cart',
                'product_purchase',
                'product_wishlist',
                'video_hide',
                'video_report',
                'seller_visit',
                'seller_follow',
                'video_share',
            ]);
            $table->json('meta')->nullable();
            $table->timestamp('occurred_at')->useCurrent();

            $table->index(['user_id', 'event', 'occurred_at']);
            $table->index(['session_id', 'event', 'occurred_at']);
            $table->index(['video_id', 'event']);
        });

        // ── 4. user_seen_videos (recreated with session_id for guests) ────────
        Schema::create('user_seen_videos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('session_id', 64)->nullable();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->timestamp('seen_at')->useCurrent();

            $table->index(['user_id', 'video_id']);
            $table->index(['session_id', 'video_id']);
            $table->index(['user_id', 'seen_at']);
            $table->unique(['user_id', 'video_id'], 'usv_user_video_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_seen_videos');
        Schema::dropIfExists('feed_events');
        Schema::dropIfExists('video_scores');
        Schema::dropIfExists('user_interests');
    }
};