<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_source_check");
        DB::statement("ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_source_check CHECK (source IN ('sale', 'payout', 'payout_reversal', 'refund', 'fee', 'bonus'))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_source_check");
        DB::statement("ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_source_check CHECK (source IN ('sale', 'payout', 'refund', 'fee', 'bonus'))");
    }
};