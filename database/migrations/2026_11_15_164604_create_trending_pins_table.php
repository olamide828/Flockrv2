<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('trending_pins')) {
            Schema::create('trending_pins', function (Blueprint $t) {
                $t->id();
                $t->string('kind', 12);                 // post | video | product
                $t->unsignedBigInteger('item_id');
                $t->unsignedSmallInteger('position')->default(0);
                $t->timestamp('expires_at')->nullable();
                $t->unsignedBigInteger('pinned_by')->nullable();
                $t->timestamps();
                $t->unique(['kind', 'item_id']);
                $t->index(['kind', 'expires_at']);
            });
        }

        // lets admins close a community room without deleting it
        if (Schema::hasTable('rooms') && !Schema::hasColumn('rooms', 'closed_at')) {
            Schema::table('rooms', fn (Blueprint $t) => $t->timestamp('closed_at')->nullable());
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('trending_pins');
        if (Schema::hasTable('rooms') && Schema::hasColumn('rooms', 'closed_at')) {
            Schema::table('rooms', fn (Blueprint $t) => $t->dropColumn('closed_at'));
        }
    }
};
