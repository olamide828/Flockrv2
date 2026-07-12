<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('room_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reply_to_id')->nullable()->constrained('room_messages')->nullOnDelete();
            $table->text('body')->nullable();
            $table->string('media_url')->nullable();
            $table->string('media_type')->nullable(); 
            $table->timestamps();
            $table->softDeletes();

            $table->index(['room_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_messages');
    }
};
