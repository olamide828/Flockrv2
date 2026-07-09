<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Run outside a transaction so the constraint check doesn't roll back the whole thing
    public $withinTransaction = false;

    public function up(): void
    {
        // Only add report_count if it doesn't already exist
        if (!Schema::hasColumn('reports', 'report_count')) {
            Schema::table('reports', function (Blueprint $table) {
                $table->unsignedInteger('report_count')->default(1)->after('status');
            });
        }

        // Drop the unique constraint only if it actually exists
        $constraintExists = DB::select("
            SELECT 1 FROM pg_constraint
            WHERE conname = 'reports_reporter_id_reported_id_unique'
            AND conrelid = 'reports'::regclass
        ");

        if (!empty($constraintExists)) {
            DB::statement('ALTER TABLE reports DROP CONSTRAINT reports_reporter_id_reported_id_unique');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('reports', 'report_count')) {
            Schema::table('reports', function (Blueprint $table) {
                $table->dropColumn('report_count');
            });
        }
    }
};