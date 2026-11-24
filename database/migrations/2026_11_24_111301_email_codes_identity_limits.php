<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('email_verification_codes')) {
            Schema::create('email_verification_codes', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->string('code_hash');
                $t->timestamp('expires_at');
                $t->unsignedTinyInteger('attempts')->default(0);
                $t->timestamp('sent_at')->nullable();
                $t->timestamps();
                $t->index('user_id');
            });
        }

        Schema::table('users', function (Blueprint $t) {
            if (!Schema::hasColumn('users', 'username_changed_at')) $t->timestamp('username_changed_at')->nullable();
            if (!Schema::hasColumn('users', 'name_changed_at'))     $t->timestamp('name_changed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_codes');
        Schema::table('users', function (Blueprint $t) {
            foreach (['username_changed_at', 'name_changed_at'] as $c) if (Schema::hasColumn('users', $c)) $t->dropColumn($c);
        });
    }
};
