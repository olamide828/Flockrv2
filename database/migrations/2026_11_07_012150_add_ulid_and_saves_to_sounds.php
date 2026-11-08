<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('sounds', 'ulid')) {
            Schema::table('sounds', fn (Blueprint $t) => $t->string('ulid', 26)->nullable()->unique()->after('id'));
        }

        // Backfill existing sounds so old shared links keep working.
        DB::table('sounds')->whereNull('ulid')->orderBy('id')->chunkById(200, function ($rows) {
            foreach ($rows as $r) {
                DB::table('sounds')->where('id', $r->id)->update(['ulid' => (string) Str::ulid()]);
            }
        });

        if (!Schema::hasTable('sound_saves')) {
            Schema::create('sound_saves', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->foreignId('sound_id')->constrained()->cascadeOnDelete();
                $t->timestamps();
                $t->unique(['user_id', 'sound_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sound_saves');
        if (Schema::hasColumn('sounds', 'ulid')) {
            Schema::table('sounds', fn (Blueprint $t) => $t->dropColumn('ulid'));
        }
    }
};
