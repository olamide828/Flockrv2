<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::table('messages', function (Blueprint $table) {
        $table->json('suggested_product_ids')->nullable()->after('is_deleted');
    });
}
public function down(): void
{
    Schema::table('messages', function (Blueprint $table) {
        $table->dropColumn('suggested_product_ids');
    });
}
};
