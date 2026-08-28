<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_user', function (Blueprint $table) {
            $table->string('chat_theme')->nullable()->default('off');
        });

        if (Schema::hasColumn('users', 'chat_theme')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('chat_theme');
            });
        }
    }

    public function down(): void
    {
        Schema::table('conversation_user', function (Blueprint $table) {
            $table->dropColumn('chat_theme');
        });
    }
};