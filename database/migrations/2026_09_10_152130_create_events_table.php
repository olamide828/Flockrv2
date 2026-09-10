<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('theme_color', 7)->nullable(); 
            $table->string('banner_image')->nullable();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('status')->default('draft'); 
            $table->json('discount_tiers')->nullable();  
            $table->unsignedInteger('scavenger_hunt_target')->nullable(); 
            $table->foreignId('scavenger_hunt_coupon_amount')->nullable();
            $table->unsignedTinyInteger('event_fee_percent')->nullable();
            $table->timestamps();

            $table->index(['status', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};