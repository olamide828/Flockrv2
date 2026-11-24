<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $t) {
            if (!Schema::hasColumn('messages', 'is_deleted'))           $t->boolean('is_deleted')->default(false);
            if (!Schema::hasColumn('messages', 'client_id'))            $t->string('client_id', 64)->nullable();
            if (!Schema::hasColumn('messages', 'suggested_product_ids')) $t->json('suggested_product_ids')->nullable();
        });
        // One client_id per sender per conversation: a retried send can never post twice (NULLs are allowed many times)
        try {
            Schema::table('messages', fn (Blueprint $t) => $t->unique(['conversation_id', 'sender_id', 'client_id'], 'messages_client_unique'));
        } catch (\Throwable) {}

        if (!Schema::hasTable('chat_restrictions')) {
            Schema::create('chat_restrictions', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('user_id')->index();
                $t->string('scope', 10)->default('all');          
                $t->text('reason')->nullable();
                $t->unsignedBigInteger('admin_id')->nullable();
                $t->timestamp('until')->nullable();               
                $t->timestamp('lifted_at')->nullable();
                $t->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_restrictions');
    }
};
