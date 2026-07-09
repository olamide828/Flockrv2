<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('avg_rating', 3, 2)->default(0)->after('total_sales');
            $table->unsignedBigInteger('total_reviews')->default(0)->after('avg_rating');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avg_rating', 'total_reviews']);
        });
    }
};