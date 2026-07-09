<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add product_id to reviews
        Schema::table('reviews', function (Blueprint $table) {
            $table->foreignId('product_id')
                ->nullable()
                ->after('seller_id')
                ->constrained()
                ->nullOnDelete();
            $table->index(['product_id', 'created_at']);
        });

        // Add per-product rating columns to products table
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'avg_rating')) {
                $table->decimal('avg_rating', 3, 2)->default(0)->after('saves_count');
            }
            if (!Schema::hasColumn('products', 'total_reviews')) {
                $table->unsignedInteger('total_reviews')->default(0)->after('avg_rating');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropIndex(['product_id', 'created_at']);
            $table->dropColumn('product_id');
        });
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['avg_rating', 'total_reviews']);
        });
    }
};