<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Enable pgvector extension (run once per database)
        // DB::statement('CREATE EXTENSION IF NOT EXISTS vector');

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon')->nullable();              // emoji or icon name
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->text('ai_description')->nullable();       // GPT-4o-mini generated
            $table->decimal('price', 12, 2);                  // NGN
            $table->decimal('compare_price', 12, 2)->nullable(); // crossed-out price
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->string('sku')->nullable()->unique();
            $table->string('currency', 5)->default('NGN');
            $table->enum('status', ['draft', 'active', 'out_of_stock', 'archived'])->default('draft');
            $table->json('images')->nullable();               // array of R2/S3 URLs
            $table->json('tags')->nullable();                 // ["ankara", "fashion", "women"]
            $table->json('attributes')->nullable();           // {"color":"red","size":"XL"}
            $table->string('condition')->default('new');      // new | used | refurbished
            $table->string('location')->nullable();           // seller's location
            $table->boolean('ships_nationwide')->default(true);
            $table->decimal('shipping_fee', 10, 2)->default(0);
            $table->unsignedBigInteger('views_count')->default(0);
            $table->unsignedBigInteger('likes_count')->default(0);
            $table->unsignedBigInteger('orders_count')->default(0);
            $table->unsignedBigInteger('saves_count')->default(0);
            $table->timestamp('ai_description_generated_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['seller_id', 'status']);
            $table->index(['category_id', 'status']);
            $table->index('status');
        });

        // pgvector column: 1024-dim for jina-embeddings-v3
        // Must use raw SQL — Blueprint doesn't know vector type
        // DB::statement('ALTER TABLE products ADD COLUMN embedding vector(1024)');
        // DB::statement('CREATE INDEX products_embedding_idx ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)');

        // Product saves/wishlist
        Schema::create('product_saves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_saves');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
    }
};
