<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('copyright_claims', function (Blueprint $t) {
            $t->text('admin_note')->nullable();
            $t->string('action_taken', 24)->nullable();                 // sound | video | rejected | restored
            $t->foreignId('actioned_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('copyright_claims', function (Blueprint $t) {
            $t->dropConstrainedForeignId('actioned_by');
            $t->dropColumn(['admin_note', 'action_taken']);
        });
    }
};
