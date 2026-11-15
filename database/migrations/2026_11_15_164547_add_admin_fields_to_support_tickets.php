<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('support_tickets')) return;
        Schema::table('support_tickets', function (Blueprint $t) {
            if (!Schema::hasColumn('support_tickets', 'admin_note'))  $t->text('admin_note')->nullable();
            if (!Schema::hasColumn('support_tickets', 'resolved_by')) $t->unsignedBigInteger('resolved_by')->nullable();
            if (!Schema::hasColumn('support_tickets', 'resolved_at')) $t->timestamp('resolved_at')->nullable();
            if (!Schema::hasColumn('support_tickets', 'outcome'))     $t->string('outcome', 20)->nullable();
        });
    }
    public function down(): void {}
};
