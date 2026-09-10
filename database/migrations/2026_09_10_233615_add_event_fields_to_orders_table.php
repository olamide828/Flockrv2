<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('event_id')->nullable()->after('checkout_batch_id')->constrained()->nullOnDelete();
            $table->decimal('event_discount_amount', 10, 2)->nullable()->after('event_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('event_id');
            $table->dropColumn('event_discount_amount');
        });
    }
};