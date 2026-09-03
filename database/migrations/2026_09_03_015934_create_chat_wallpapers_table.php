<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_wallpapers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('image_path');
            $table->timestamps();
        });

        Schema::table('conversation_user', function (Blueprint $table) {
            $table->foreignId('chat_wallpaper_id')->nullable()->constrained('chat_wallpapers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('conversation_user', function (Blueprint $table) {
            $table->dropConstrainedForeignId('chat_wallpaper_id');
        });
        Schema::dropIfExists('chat_wallpapers');
    }
};