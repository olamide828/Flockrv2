<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();                  // e.g. RATE200_X7K9P
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('review_id')->nullable()->constrained('reviews')->nullOnDelete();
            $table->decimal('amount', 10, 2)->default(200);    // discount value in NGN
            $table->decimal('min_order', 10, 2)->default(2000);// minimum cart total to apply
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_on_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamps();

            $table->index(['buyer_id', 'used_at']);            // fast lookup: unused coupons for buyer
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};