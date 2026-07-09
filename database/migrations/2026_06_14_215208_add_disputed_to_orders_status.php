<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
 
return new class extends Migration {
    public function up(): void
    {
        // Check what constraint name your orders table uses first:
        // SELECT conname FROM pg_constraint WHERE conrelid = 'orders'::regclass AND contype = 'c';
        DB::statement("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
        DB::statement("ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(20)");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','paid','confirmed','processing','shipped','delivered','cancelled','refunded','disputed'))");
    }
 
    public function down(): void
    {
        DB::statement("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','paid','confirmed','processing','shipped','delivered','cancelled','refunded'))");
    }
};