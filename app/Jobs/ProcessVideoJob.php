<?php

namespace App\Jobs;

use App\Models\Video;
use App\Services\StorageService;
use FFMpeg\FFMpeg;
use FFMpeg\Coordinate\TimeCode;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ProcessVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Video $video)
    {
    }

    public function handle(StorageService $storageService): void
    {
        $videoPath = storage_path("app/{$this->video->video_url}");

        if (!file_exists($videoPath)) {
            $this->video->update(['status' => 'failed']);
            return;
        }

        $ffmpeg = FFMpeg::create();

        $movie = $ffmpeg->open($videoPath);

        // ─────────────────────────────────────────
        // 1. Generate thumbnail (at 1 second mark)
        // ─────────────────────────────────────────
        $thumbnailName = "thumbnails/{$this->video->id}.jpg";
        $thumbnailPath = storage_path("app/public/{$thumbnailName}");

        $movie
            ->frame(TimeCode::fromSeconds(1))
            ->save($thumbnailPath);

        $thumbnailUrl = $storageService->uploadFilePublic($thumbnailPath, $thumbnailName);

        // ─────────────────────────────────────────
        // 2. OPTIONAL: simple MP4 re-save (fallback instead of HLS)
        // ─────────────────────────────────────────
        $processedName = "processed/{$this->video->id}.mp4";
        $processedPath = storage_path("app/public/{$processedName}");

        $movie
            ->filters()
            ->resize(new \FFMpeg\Coordinate\Dimension(1080, 1920))
            ->synchronize();

        $movie->save(new \FFMpeg\Format\Video\X264(), $processedPath);

        $processedUrl = $storageService->uploadFilePublic($processedPath, $processedName);

        // ─────────────────────────────────────────
        // 3. Update DB (THIS IS THE IMPORTANT PART)
        // ─────────────────────────────────────────
        $this->video->update([
            'thumbnail_url' => $thumbnailUrl,
            'video_url' => $processedUrl,
            'status' => 'active',
            'published_at' => now(),
        ]);

        // cleanup local temp files
        @unlink($thumbnailPath);
        @unlink($processedPath);
    }
}