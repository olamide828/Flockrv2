<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('badges', function (Blueprint $table) {
            $table->string('requirement_label')->nullable()->after('description'); // "Sell 10 products"
            $table->string('progress_metric')->nullable()->after('requirement_label'); // machine key, e.g. 'orders_count'
            $table->integer('progress_target')->nullable()->after('progress_metric'); // e.g. 10
            $table->enum('audience', ['seller', 'buyer', 'both'])->default('both')->after('progress_target');
        });
    }
    public function down(): void
    {
        Schema::table('badges', function (Blueprint $table) {
            $table->dropColumn(['requirement_label', 'progress_metric', 'progress_target', 'audience']);
        });
    }
};