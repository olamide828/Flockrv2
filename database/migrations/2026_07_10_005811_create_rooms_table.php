<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('avatar')->nullable();         // room avatar image
            $table->text('description')->nullable();
            $table->json('rules')->nullable();            // array of rule strings
            $table->boolean('is_private')->default(false);
            $table->unsignedInteger('members_count')->default(0);
            $table->unsignedInteger('posts_count')->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('rooms'); }
};

