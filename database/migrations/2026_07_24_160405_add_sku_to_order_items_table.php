<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('sku_id')
                ->nullable()
                ->after('product_id')
                ->constrained('product_skus')
                ->nullOnDelete();
            $table->json('variant_options')->nullable()->after('sku_id');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['sku_id']);
            $table->dropColumn(['sku_id', 'variant_options']);
        });
    }
};