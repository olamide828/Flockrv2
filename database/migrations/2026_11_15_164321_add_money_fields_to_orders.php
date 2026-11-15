<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // What the seller actually earns: subtotal - coupon share - platform fee.
            // Never includes courier fees or Flockr's delivery fee.
            $table->decimal('seller_earning', 12, 2)->nullable()->after('platform_fee');
            // Flockr's own delivery-management fee on this order (first order of a batch only).
            $table->decimal('flockr_fee', 12, 2)->default(0)->after('seller_earning');
            // Coupon money knocked off this order.
            $table->decimal('discount_amount', 12, 2)->default(0)->after('flockr_fee');
            // The full amount actually charged on Paystack for the whole checkout batch.
            // Used to verify the paid amount. `total` stays this order's own share.
            $table->decimal('payment_total', 12, 2)->nullable()->after('total');
            // Refund tracking so admin can see and retry failures.
            $table->string('refund_status', 20)->nullable()->index();
            $table->text('refund_error')->nullable();
            $table->timestamp('refunded_at')->nullable();
        });

        // Backfill existing rows with the old (approximate) formula.
        DB::statement('UPDATE orders SET seller_earning = GREATEST(subtotal - platform_fee, 0) WHERE seller_earning IS NULL');
        DB::statement('UPDATE orders SET payment_total = total WHERE payment_total IS NULL');

        Schema::table('wallet_transactions', function (Blueprint $table) {
            // One sale credit / one reversal per order: enforced by the database, not just code.
            $table->unique(['order_id', 'source'], 'wallet_tx_order_source_unique');
        });
    }

    public function down(): void
    {
        Schema::table('wallet_transactions', fn (Blueprint $t) => $t->dropUnique('wallet_tx_order_source_unique'));
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['seller_earning', 'flockr_fee', 'discount_amount', 'payment_total', 'refund_status', 'refund_error', 'refunded_at']);
        });
    }
};
