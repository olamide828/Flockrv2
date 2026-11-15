<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('admin_audit_logs')) return;
        Schema::create('admin_audit_logs', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('admin_id')->nullable()->index();
            $t->string('action', 80)->index();          // e.g. order.refund, user.suspend
            $t->string('target_type', 40)->nullable();  // order, user, video…
            $t->unsignedBigInteger('target_id')->nullable();
            $t->json('meta')->nullable();
            $t->string('ip', 45)->nullable();
            $t->timestamps();
            $t->index(['target_type', 'target_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('admin_audit_logs'); }
};
