<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_skus', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')
                ->constrained()
                ->cascadeOnDelete(); // SKUs die with the product
            $table->string('sku_code')->unique(); // e.g. "ANKDRESS-RED-L"
            // variant combination — e.g. {"Color":"Red","Size":"L"}
            $table->json('variant_options');
            $table->decimal('price', 12, 2)->nullable();        // overrides product price if set
            $table->decimal('seller_price', 12, 2)->nullable(); // overrides product seller_price if set
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('product_id');
            $table->index('sku_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_skus');
    }
};