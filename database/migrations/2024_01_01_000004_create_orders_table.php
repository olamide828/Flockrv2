<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();             // e.g. FLK-20240501-XXXX
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('video_id')->nullable()->constrained()->nullOnDelete(); // which video drove the sale
            $table->enum('status', [
                'pending',
                'paid',
                'confirmed',
                'processing',
                'shipped',
                'delivered',
                'cancelled',
                'refunded',
            ])->default('pending');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('shipping_fee', 10, 2)->default(0);
            $table->decimal('platform_fee', 10, 2)->default(0);   // Flockr's cut
            $table->decimal('total', 12, 2);
            $table->string('currency', 5)->default('NGN');
            // Paystack
            $table->string('paystack_reference')->nullable()->unique();
            $table->string('paystack_transaction_id')->nullable();
            $table->timestamp('paid_at')->nullable();
            // Shipping
            $table->json('shipping_address')->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('courier')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['buyer_id', 'status']);
            $table->index(['seller_id', 'status']);
            $table->index('status');
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('product_name');                   // snapshot at purchase time
            $table->decimal('unit_price', 12, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('total', 12, 2);
            $table->json('attributes')->nullable();           // {"color":"red","size":"L"}
            $table->timestamps();

            $table->index('order_id');
        });

        // Payouts to sellers
        Schema::create('payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 5)->default('NGN');
            $table->enum('status', ['pending', 'processing', 'paid', 'failed'])->default('pending');
            $table->string('paystack_transfer_code')->nullable();
            $table->json('order_ids')->nullable();             // which orders are in this payout
            $table->timestamp('paid_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamps();

            $table->index(['seller_id', 'status']);
        });

        // Seller wallet / balance
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->enum('type', ['credit', 'debit']);
            $table->enum('source', ['sale', 'payout', 'refund', 'fee', 'bonus']);
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description')->nullable();
            $table->decimal('balance_after', 12, 2);
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('payouts');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
