<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('off_platform_warnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            // "seller_id" here just means "the other participant the warning concerns" —
            // in a P2P chat either side could trigger it, this column names who it's about.
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->enum('action', ['shown', 'continued', 'paid_flockr']);
            $table->string('trigger_keyword', 100)->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'action']);
            $table->index(['seller_id', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('off_platform_warnings');
    }
};