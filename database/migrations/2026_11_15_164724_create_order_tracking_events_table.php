<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('order_tracking_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->string('source', 20)->default('terminal');   // terminal | flockr
            $t->string('event', 60);                         // e.g. shipment.picked_up, order.paid
            $t->string('title', 160);
            $t->text('description')->nullable();
            $t->string('location', 160)->nullable();
            $t->timestamp('occurred_at')->index();
            $t->string('dedupe_key', 120);
            $t->json('payload')->nullable();
            $t->timestamps();
            $t->unique(['order_id', 'dedupe_key']);
        });
    }

    public function down(): void { Schema::dropIfExists('order_tracking_events'); }
};
