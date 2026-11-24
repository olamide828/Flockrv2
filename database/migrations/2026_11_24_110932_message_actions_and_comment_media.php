<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // "Edited" label on DMs and room messages
        if (!Schema::hasColumn('messages', 'edited_at')) {
            Schema::table('messages', fn (Blueprint $t) => $t->timestamp('edited_at')->nullable());
        }
        if (!Schema::hasColumn('room_messages', 'edited_at')) {
            Schema::table('room_messages', fn (Blueprint $t) => $t->timestamp('edited_at')->nullable());
        }

        // One emoji reaction per person per message (changing it replaces it)
        if (!Schema::hasTable('message_reactions')) {
            Schema::create('message_reactions', function (Blueprint $t) {
                $t->id();
                $t->foreignId('message_id')->constrained('messages')->cascadeOnDelete();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->string('emoji', 16);
                $t->timestamps();
                $t->unique(['message_id', 'user_id']);
            });
        }
        if (!Schema::hasTable('room_message_reactions')) {
            Schema::create('room_message_reactions', function (Blueprint $t) {
                $t->id();
                $t->foreignId('room_message_id')->constrained('room_messages')->cascadeOnDelete();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->string('emoji', 16);
                $t->timestamps();
                $t->unique(['room_message_id', 'user_id']);
            });
        }

        // Saved community posts
        if (!Schema::hasTable('post_saves')) {
            Schema::create('post_saves', function (Blueprint $t) {
                $t->id();
                $t->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->timestamps();
                $t->unique(['post_id', 'user_id']);
            });
        }

        // Delivered ticks (✓✓): when the recipient's app received the message
        if (!Schema::hasColumn('messages', 'delivered_at')) {
            Schema::table('messages', fn (Blueprint $t) => $t->timestamp('delivered_at')->nullable());
        }
        // Last emoji reaction in a chat, so the inbox list can show "You: Reacted 👍 to …"
        if (!Schema::hasColumn('conversations', 'last_reaction')) {
            Schema::table('conversations', fn (Blueprint $t) => $t->json('last_reaction')->nullable());
        }

        // Comments: a picture, and "the creator liked this"
        Schema::table('comments', function (Blueprint $t) {
            if (!Schema::hasColumn('comments', 'image_path')) $t->string('image_path', 500)->nullable();
            if (!Schema::hasColumn('comments', 'liked_by_creator')) $t->boolean('liked_by_creator')->default(false);
        });
        // Body can be empty when the comment is only a picture
        try { \DB::statement('ALTER TABLE comments ALTER COLUMN body DROP NOT NULL'); } catch (\Throwable) {}
    }

    public function down(): void
    {
        Schema::dropIfExists('post_saves');
        Schema::dropIfExists('room_message_reactions');
        Schema::dropIfExists('message_reactions');
        Schema::table('comments', fn (Blueprint $t) => $t->dropColumn(['image_path', 'liked_by_creator']));
        Schema::table('room_messages', fn (Blueprint $t) => $t->dropColumn('edited_at'));
        Schema::table('messages', fn (Blueprint $t) => $t->dropColumn('edited_at'));
    }
};
