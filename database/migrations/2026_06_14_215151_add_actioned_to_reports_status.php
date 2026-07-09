<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
 
return new class extends Migration {
    public function up(): void
    {
        // Drop old constraint and recreate with 'actioned' included
        DB::statement("ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check");
        DB::statement("ALTER TABLE reports ALTER COLUMN status TYPE VARCHAR(20)");
        DB::statement("ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed'))");
    }
 
    public function down(): void
    {
        DB::statement("ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check");
        DB::statement("ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status IN ('pending', 'reviewed', 'dismissed'))");
    }
};