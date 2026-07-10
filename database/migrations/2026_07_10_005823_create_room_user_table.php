<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('room_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('member');    // member | moderator
            $table->timestamp('last_read_at')->nullable(); // for unread indicator
            $table->timestamps();
            $table->unique(['room_id', 'user_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('room_user'); }
};
