<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Raw SQL rather than Blueprint::change() — avoids requiring
        // doctrine/dbal just for this one constraint drop.
        DB::statement('ALTER TABLE posts ALTER COLUMN content DROP NOT NULL');
    }

    public function down(): void
    {
        // Backfill any existing nulls before re-adding the constraint,
        // or the down-migration itself would fail the same way.
        DB::statement("UPDATE posts SET content = '' WHERE content IS NULL");
        DB::statement('ALTER TABLE posts ALTER COLUMN content SET NOT NULL');
    }
};