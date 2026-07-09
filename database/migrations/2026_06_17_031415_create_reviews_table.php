<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('rating', 3, 1);                  // 1.0 – 5.0 (4.5 for 5★ no photo)
            $table->text('body')->nullable();
            $table->string('photo')->nullable();               // storage key if buyer uploads photo
            $table->timestamps();

            $table->unique('order_id');                        // one review per order
            $table->index(['seller_id', 'created_at']);
            $table->index('buyer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};