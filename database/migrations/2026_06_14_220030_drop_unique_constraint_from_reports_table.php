<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Drop the unique constraint that prevents a user from reporting
        // the same person via different channels (chat, profile, order)
        Schema::table('reports', function (Blueprint $table) {
            $table->dropUnique(['reporter_id', 'reported_id']);
        });

        // Also add order_id and conversation_id columns if they don't exist yet
        // (skip if you already ran the previous migrations)
        if (!Schema::hasColumn('reports', 'conversation_id')) {
            Schema::table('reports', function (Blueprint $table) {
                $table->foreignId('conversation_id')
                    ->nullable()
                    ->constrained('conversations')
                    ->nullOnDelete()
                    ->after('reported_id');
            });
        }

        if (!Schema::hasColumn('reports', 'order_id')) {
            Schema::table('reports', function (Blueprint $table) {
                $table->foreignId('order_id')
                    ->nullable()
                    ->constrained('orders')
                    ->nullOnDelete()
                    ->after('conversation_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->unique(['reporter_id', 'reported_id']);
        });
    }
};