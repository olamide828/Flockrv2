<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('room_messages', function (Blueprint $table) {
            $table->unsignedInteger('likes_count')->default(0)->after('is_deleted');
        });

        Schema::create('room_message_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['room_message_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_message_likes');
        Schema::table('room_messages', function (Blueprint $table) {
            $table->dropColumn('likes_count');
        });
    }
};