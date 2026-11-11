<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sounds', function (Blueprint $t) {
            $t->boolean('is_artist_submission')->default(false)->after('genre');
            $t->string('submission_status', 12)->nullable()->index()->after('is_artist_submission'); // pending|approved|rejected|withdrawn
            $t->text('submission_note')->nullable();          // admin's reason when rejected
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('reviewed_at')->nullable();
            $t->timestamp('rights_accepted_at')->nullable();
            $t->string('terms_version', 16)->nullable();
            $t->string('artist_link', 300)->nullable();       // proof the uploader is the artist
            $t->string('legal_name', 120)->nullable();
            $t->string('contact_email', 190)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('sounds', function (Blueprint $t) {
            $t->dropColumn(['is_artist_submission', 'submission_status', 'submission_note', 'submitted_at', 'reviewed_at', 'rights_accepted_at', 'terms_version', 'artist_link', 'legal_name', 'contact_email']);
        });
    }
};
