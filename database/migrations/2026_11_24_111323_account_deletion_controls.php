<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (!Schema::hasColumn('users', 'deleted_username'))      $t->string('deleted_username')->nullable()->index();   // the handle people used to visit (/@old) so the profile can show "deleted"
            if (!Schema::hasColumn('users', 'deletion_requested_at')) $t->timestamp('deletion_requested_at')->nullable();
            if (!Schema::hasColumn('users', 'legal_hold'))            $t->boolean('legal_hold')->default(false);
            if (!Schema::hasColumn('users', 'legal_hold_reason'))     $t->string('legal_hold_reason', 500)->nullable();
            if (!Schema::hasColumn('users', 'legal_hold_at'))         $t->timestamp('legal_hold_at')->nullable();
            if (!Schema::hasColumn('users', 'legal_hold_by'))         $t->unsignedBigInteger('legal_hold_by')->nullable();
            if (!Schema::hasColumn('users', 'purged_at'))             $t->timestamp('purged_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            foreach (['deleted_username', 'deletion_requested_at', 'legal_hold', 'legal_hold_reason', 'legal_hold_at', 'legal_hold_by', 'purged_at'] as $c) {
                if (Schema::hasColumn('users', $c)) $t->dropColumn($c);
            }
        });
    }
};
