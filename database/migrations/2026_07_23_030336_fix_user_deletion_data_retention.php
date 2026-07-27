<?php
// database/migrations/xxxx_fix_user_deletion_data_retention.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── orders: cascadeOnDelete → nullOnDelete on buyer/seller FKs ──────
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['buyer_id']);
            $table->dropForeign(['seller_id']);

            $table->unsignedBigInteger('buyer_id')->nullable()->change();
            $table->unsignedBigInteger('seller_id')->nullable()->change();

            $table->foreign('buyer_id')
                ->references('id')->on('users')
                ->nullOnDelete();
            $table->foreign('seller_id')
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        // ── payouts: cascadeOnDelete → nullOnDelete ───────────────────────────
        Schema::table('payouts', function (Blueprint $table) {
            $table->dropForeign(['seller_id']);
            $table->unsignedBigInteger('seller_id')->nullable()->change();
            $table->foreign('seller_id')
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        // ── wallet_transactions: cascadeOnDelete → nullOnDelete ───────────────
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreign('user_id')
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        // ── users: add deleted_name and deleted_email only ────────────────────
        // deletion_scheduled_at already exists from a previous migration
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'deleted_name')) {
                $table->string('deleted_name')->nullable()->after('deleted_at');
            }
            if (!Schema::hasColumn('users', 'deleted_email')) {
                $table->string('deleted_email')->nullable()->after('deleted_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['deleted_name', 'deleted_email']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['buyer_id']);
            $table->dropForeign(['seller_id']);
            $table->unsignedBigInteger('buyer_id')->nullable(false)->change();
            $table->unsignedBigInteger('seller_id')->nullable(false)->change();
            $table->foreign('buyer_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('seller_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('payouts', function (Blueprint $table) {
            $table->dropForeign(['seller_id']);
            $table->unsignedBigInteger('seller_id')->nullable(false)->change();
            $table->foreign('seller_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};