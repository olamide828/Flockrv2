<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('post_views', function (Blueprint $table) {
            $table->string('viewer_key')->nullable()->after('session_id');
        });

        // Backfill so existing rows aren't just dropped — collapse any
        // pre-existing "duplicate" rows per viewer down to their first view.
        DB::statement("
            UPDATE post_views
            SET viewer_key = CASE
                WHEN user_id IS NOT NULL THEN 'u:' || user_id
                WHEN session_id IS NOT NULL THEN 's:' || session_id
                ELSE NULL
            END
        ");

        DB::table('post_views')
            ->whereNotNull('viewer_key')
            ->select('post_id', 'viewer_key', DB::raw('MIN(id) as keep_id'))
            ->groupBy('post_id', 'viewer_key')
            ->get()
            ->each(function ($row) {
                DB::table('post_views')
                    ->where('post_id', $row->post_id)
                    ->where('viewer_key', $row->viewer_key)
                    ->where('id', '!=', $row->keep_id)
                    ->delete();
            });

        Schema::table('post_views', function (Blueprint $table) {
            $table->dropUnique('post_views_post_id_user_id_session_id_unique');
            $table->unique(['post_id', 'viewer_key']);
        });

        // Recompute views_count from the now-deduplicated table so past
        // inflation from the bug doesn't linger on posts you already tested with.
        DB::statement("
            UPDATE posts SET views_count = (
                SELECT COUNT(*) FROM post_views WHERE post_views.post_id = posts.id
            )
        ");
    }

    public function down(): void
    {
        Schema::table('post_views', function (Blueprint $table) {
            $table->dropUnique(['post_id', 'viewer_key']);
            $table->dropColumn('viewer_key');
            $table->unique(['post_id', 'user_id', 'session_id']);
        });
    }
};