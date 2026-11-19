<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Estimated delivery date shown to the buyer (taken from the courier rate they picked at checkout). */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            if (!Schema::hasColumn('orders', 'estimated_delivery')) $t->timestamp('estimated_delivery')->nullable();
            if (!Schema::hasColumn('orders', 'eta_text'))           $t->string('eta_text', 80)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            if (Schema::hasColumn('orders', 'eta_text')) $t->dropColumn('eta_text');
        });
    }
};
