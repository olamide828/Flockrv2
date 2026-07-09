<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // delivered_at already exists in the schema — skip if present
            // last_rating_reminder_at tracks which interval was last sent (24h/72h/7d)
            $table->timestamp('last_rating_reminder_at')->nullable()->after('delivered_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('last_rating_reminder_at');
        });
    }
};