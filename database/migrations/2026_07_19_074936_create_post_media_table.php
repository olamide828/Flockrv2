<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('post_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->string('media_url');
            $table->string('media_type'); // image | video
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

       
        DB::table('posts')->whereNotNull('media_url')->orderBy('id')->chunk(200, function ($posts) {
            $rows = [];
            foreach ($posts as $post) {
                $rows[] = [
                    'post_id'    => $post->id,
                    'media_url'  => $post->media_url,
                    'media_type' => $post->media_type ?? 'image',
                    'position'   => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            if ($rows) DB::table('post_media')->insert($rows);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_media');
    }
};