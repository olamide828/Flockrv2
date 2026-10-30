<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('copyright_claims', function (Blueprint $t) {
            $t->id();
            $t->foreignId('video_id')->nullable()->constrained('videos')->nullOnDelete();
            $t->foreignId('sound_id')->nullable()->constrained('sounds')->nullOnDelete();
            $t->foreignId('reporter_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('claimant_name', 120);
            $t->string('claimant_email', 160);
            $t->text('details');
            $t->string('status', 16)->default('open')->index();   // open | actioned | rejected
            $t->timestamp('actioned_at')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('copyright_claims');
    }
};
