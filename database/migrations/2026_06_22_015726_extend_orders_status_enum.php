<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Laravel uses CHECK constraints for enums in PostgreSQL, not named types.
        // We need to drop the existing check constraint and recreate it with new values.

        // Find and drop the existing check constraint on orders.status
        DB::statement("
            ALTER TABLE orders
            DROP CONSTRAINT IF EXISTS orders_status_check
        ");

        // Recreate with all values including new ones
        DB::statement("
            ALTER TABLE orders
            ADD CONSTRAINT orders_status_check
            CHECK (status IN (
                'pending',
                'paid',
                'confirmed',
                'processing',
                'ready_for_pickup',
                'shipped',
                'delivered',
                'cancelled',
                'refunded',
                'disputed',
                'pickup_failed',
                'delivery_failed',
                'returned'
            ))
        ");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");

        DB::statement("
            ALTER TABLE orders
            ADD CONSTRAINT orders_status_check
            CHECK (status IN (
                'pending','paid','confirmed','processing',
                'shipped','delivered','cancelled','refunded','disputed'
            ))
        ");
    }
}; 