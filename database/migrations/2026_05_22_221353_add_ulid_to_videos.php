<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('videos', function (Blueprint $table) {
            // Add ulid as a separate string column if it doesn't exist
            if (!Schema::hasColumn('videos', 'ulid')) {
                $table->string('ulid', 26)->nullable()->unique()->after('id');
            }
        });

        // Backfill existing rows that have no ulid
        DB::table('videos')->whereNull('ulid')->get()->each(function ($video) {
            DB::table('videos')
                ->where('id', $video->id)
                ->update(['ulid' => (string) Str::ulid()]);
        });

        // Now make it non-nullable
        Schema::table('videos', function (Blueprint $table) {
            $table->string('ulid', 26)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('videos', function (Blueprint $table) {
            $table->dropColumn('ulid');
        });
    }
};