<?php
// database/migrations/xxxx_xx_xx_add_seller_price_to_products_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // What the seller wants to pocket — stored alongside the listed price.
            // 'price' stays as the buyer-facing listed price (seller_price / 0.95).
            $table->decimal('seller_price', 12, 2)->nullable()->after('price');
        });

        // Back-fill existing products: seller_price = price * 0.95
        // (reverse of the formula — existing listings had no commission baked in)
        \DB::statement('UPDATE products SET seller_price = ROUND(price * 0.95, 2) WHERE seller_price IS NULL');
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('seller_price');
        });
    }
};