<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('post_seen', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('session_id')->nullable();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->timestamp('seen_at');

            $table->unique(['user_id', 'post_id']);
            $table->unique(['session_id', 'post_id']);
            $table->index('seen_at'); // for the rolling-window cleanup / exclusion query
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_seen');
    }
};