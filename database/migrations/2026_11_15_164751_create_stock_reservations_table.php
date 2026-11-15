<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_reservations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->unsignedInteger('quantity');
            $t->timestamp('expires_at')->index();
            $t->timestamps();
            $t->unique(['order_id', 'product_id']);
            $t->index(['product_id', 'expires_at']);
        });
    }

    public function down(): void { Schema::dropIfExists('stock_reservations'); }
};
