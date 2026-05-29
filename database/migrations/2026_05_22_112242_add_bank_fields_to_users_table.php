<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Only add columns that don't already exist
            if (!Schema::hasColumn('users', 'paystack_recipient_code')) {
                $table->string('paystack_recipient_code')->nullable()->after('paystack_subaccount_code');
            }
            if (!Schema::hasColumn('users', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('paystack_recipient_code');
            }
            if (!Schema::hasColumn('users', 'bank_code')) {
                $table->string('bank_code')->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('users', 'account_number')) {
                $table->string('account_number')->nullable()->after('bank_code');
            }
            if (!Schema::hasColumn('users', 'account_last4')) {
                $table->string('account_last4', 4)->nullable()->after('account_number');
            }
            if (!Schema::hasColumn('users', 'account_name')) {
                $table->string('account_name')->nullable()->after('account_last4');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'paystack_recipient_code',
                'bank_name',
                'bank_code',
                'account_number',
                'account_last4',
                'account_name',
            ]);
        });
    }
};