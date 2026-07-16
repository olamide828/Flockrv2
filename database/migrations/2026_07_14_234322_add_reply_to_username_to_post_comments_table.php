<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('post_comments', function (Blueprint $table) {
            // Flat-thread pattern (matches your video CommentSheet): a reply
            // to a reply still stores parent_id = the ROOT comment's id, and
            // this column carries who it's tagging, e.g. "@username".
            $table->string('reply_to_username')->nullable()->after('parent_id');
        });
    }

    public function down(): void
    {
        Schema::table('post_comments', function (Blueprint $table) {
            $table->dropColumn('reply_to_username');
        });
    }
};