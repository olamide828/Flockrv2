<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $t) {
            if (!Schema::hasColumn('coupons', 'kind'))           $t->string('kind', 10)->default('fixed');     
            if (!Schema::hasColumn('coupons', 'percent'))        $t->decimal('percent', 5, 2)->nullable();
            if (!Schema::hasColumn('coupons', 'max_discount'))   $t->decimal('max_discount', 12, 2)->nullable();
            if (!Schema::hasColumn('coupons', 'is_public'))      $t->boolean('is_public')->default(false)->index();
            if (!Schema::hasColumn('coupons', 'is_active'))      $t->boolean('is_active')->default(true);
            if (!Schema::hasColumn('coupons', 'max_uses'))       $t->unsignedInteger('max_uses')->nullable();
            if (!Schema::hasColumn('coupons', 'uses_count'))     $t->unsignedInteger('uses_count')->default(0);
            if (!Schema::hasColumn('coupons', 'per_user_limit')) $t->unsignedInteger('per_user_limit')->default(1);
            if (!Schema::hasColumn('coupons', 'new_users_only')) $t->boolean('new_users_only')->default(false); 
            if (!Schema::hasColumn('coupons', 'funded_by'))      $t->string('funded_by', 10)->default('shared'); 
            if (!Schema::hasColumn('coupons', 'campaign'))       $t->string('campaign', 120)->nullable();      
            if (!Schema::hasColumn('coupons', 'starts_at'))      $t->timestamp('starts_at')->nullable();
        });

        
        Schema::table('coupons', function (Blueprint $t) {
            $t->unsignedBigInteger('buyer_id')->nullable()->change();
            $t->decimal('amount', 12, 2)->default(0)->change();
        });

        if (!Schema::hasTable('coupon_redemptions')) {
            Schema::create('coupon_redemptions', function (Blueprint $t) {
                $t->id();
                $t->foreignId('coupon_id')->constrained()->cascadeOnDelete();
                $t->unsignedBigInteger('user_id')->index();
                $t->unsignedBigInteger('order_id')->unique();
                $t->decimal('discount', 12, 2)->default(0);
                $t->string('status', 10)->default('reserved');   
                $t->timestamps();
                $t->index(['coupon_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_redemptions');
    }
};
