<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add structured pickup address to sellers on users table
        Schema::table('users', function (Blueprint $table) {
            $table->string('pickup_street')->nullable()->after('location');
            $table->string('pickup_city')->nullable()->after('pickup_street');
            $table->string('pickup_state')->nullable()->after('pickup_city');
            $table->string('pickup_postal_code', 20)->nullable()->after('pickup_state');
        });

        // Add Terminal + courier fields to orders
        Schema::table('orders', function (Blueprint $table) {
            $table->string('terminal_shipment_id')->nullable()->after('courier');
            $table->string('terminal_rate_id')->nullable()->after('terminal_shipment_id');
            $table->string('courier_name')->nullable()->after('terminal_rate_id');
            $table->decimal('courier_fee', 10, 2)->default(0)->after('courier_name');
            $table->foreignId('delivery_address_id')->nullable()->constrained('user_addresses')->nullOnDelete()->after('shipping_address');
            // Extend status enum to include pickup/delivery failure states
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['pickup_street', 'pickup_city', 'pickup_state', 'pickup_postal_code']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['terminal_shipment_id', 'terminal_rate_id', 'courier_name', 'courier_fee', 'delivery_address_id']);
        });
    }
};