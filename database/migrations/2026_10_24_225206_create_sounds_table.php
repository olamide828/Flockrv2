<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sounds', function (Blueprint $t) {
            $t->id();
            $t->string('source', 12)->default('library');          // library | original
            $t->unsignedBigInteger('user_id')->nullable();           // creator of an original sound
            $t->unsignedBigInteger('video_id')->nullable();          // video an original sound came from (FK added in the next migration)
            $t->string('title', 160);
            $t->string('artist', 160)->default('Unknown');
            $t->string('file_path');
            $t->string('cover_path')->nullable();
            $t->unsignedInteger('duration')->default(0);             // seconds
            $t->string('license', 120)->nullable();                  // e.g. "Pixabay Content License", "CC0"
            $t->string('license_url')->nullable();
            $t->string('attribution')->nullable();                   // credit line if the licence requires one
            $t->unsignedInteger('uses_count')->default(0);
            $t->boolean('is_active')->default(true);                 // flip to false to take a sound down
            $t->timestamps();

            $t->index(['source', 'is_active', 'uses_count']);
            $t->index('video_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sounds');
    }
};
