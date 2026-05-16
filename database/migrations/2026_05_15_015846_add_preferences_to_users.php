<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Buyer feed preferences: interests, budget, onboarding_completed
            $table->json('preferences')->nullable()->after('notification_preferences');

            // Track which videos a user has seen (for feed deduplication)
            // We store this in a separate table for scalability
        });

        // Separate table to track seen videos per user
        Schema::create('user_seen_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('video_id')->constrained()->cascadeOnDelete();
            $table->timestamp('seen_at')->useCurrent();

            $table->unique(['user_id', 'video_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_seen_videos');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('preferences');
        });
    }
};