<?php

namespace App\Jobs;

use App\Models\Video;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProcessVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120; // reduced — we no longer download the whole file
    public int $tries   = 2;

    public function __construct(public Video $video) {}

    public function handle(): void
    {
        try {
            $this->video->update(['status' => 'processing']);

            $disk = config('filesystems.default', 'public');

            // ── Get the video source URL/path for FFmpeg ──────────────────────
            // KEY FIX: For R2/S3, pass the full public URL directly to FFmpeg.
            // FFmpeg can read from HTTP URLs — no download needed.
            // This is what makes thumbnails fast.
            $videoSource = $this->getVideoSource($disk);

            if (!$videoSource) {
                Log::warning("ProcessVideoJob: could not resolve video source for #{$this->video->id}");
                $this->activateVideo();
                return;
            }

            // ── Generate thumbnail ────────────────────────────────────────────
            $thumbnailKey = $this->generateThumbnail($videoSource, $disk);

            // ── Get duration ──────────────────────────────────────────────────
            $duration = $this->getDuration($videoSource);

            // ── Activate video ────────────────────────────────────────────────
            $this->video->update(array_filter([
                'status'           => 'active',
                'published_at'     => now(),
                'thumbnail_url'    => $thumbnailKey,
                'duration_seconds' => $duration,
            ], fn($v) => $v !== null));

            Log::info("ProcessVideoJob: video #{$this->video->id} done", [
                'thumbnail' => $thumbnailKey,
                'duration'  => $duration,
            ]);

        } catch (\Throwable $e) {
            Log::error("ProcessVideoJob failed for #{$this->video->id}: " . $e->getMessage());
            $this->activateVideo(); // always activate so video isn't stuck
        }
    }

    /**
     * Get the video source for FFmpeg.
     *
     * For R2/S3: returns the full public CDN URL — FFmpeg reads it over HTTP.
     * No downloading. This is the key performance fix.
     *
     * For local storage: returns the absolute file path.
     */
    private function getVideoSource(string $disk): ?string
    {
        $key = $this->video->video_url;
        if (!$key) return null;

        if (in_array($disk, ['public', 'local'])) {
            // Local — return file path
            $path = storage_path('app/public/' . ltrim($key, '/'));
            return file_exists($path) ? $path : null;
        }

        // R2/S3 — build the public CDN URL
        // FFmpeg reads HTTP URLs natively, no download needed
        $baseUrl = rtrim(config("filesystems.disks.{$disk}.url", ''), '/');
        if (!$baseUrl) {
            // No public URL configured — fall back to downloading
            return $this->downloadToTemp($disk, $key);
        }

        return $baseUrl . '/' . ltrim($key, '/');
    }

    /**
     * Fallback: download video to a temp file if no public URL is available.
     * Only used when R2/S3 bucket is private with no CDN URL.
     */
    private function downloadToTemp(string $disk, string $key): ?string
    {
        try {
            Log::info("ProcessVideoJob: downloading video to temp (no CDN URL configured)");
            $contents = Storage::disk($disk)->get($key);
            if (!$contents) return null;

            $ext     = pathinfo($key, PATHINFO_EXTENSION) ?: 'mp4';
            $tmpPath = sys_get_temp_dir() . '/' . Str::uuid() . '.' . $ext;
            file_put_contents($tmpPath, $contents);
            return $tmpPath;
        } catch (\Throwable $e) {
            Log::error("ProcessVideoJob: download failed: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Generate thumbnail using FFmpeg.
     *
     * Extracts frame at 1 second. Works with both local paths and HTTP URLs.
     * Returns the storage key on success, null if FFmpeg is unavailable.
     */
   private function generateThumbnail(string $videoSource, string $disk): ?string
{
    $ffmpeg = getenv('HOME') . '/bin/ffmpeg';

    // Check FFmpeg is installed
    exec($ffmpeg . ' -version 2>&1', $out, $code);
    if ($code !== 0) {
        Log::warning('ProcessVideoJob: ffmpeg not found — skipping thumbnail');
        return null;
    }

    $tmpThumb = sys_get_temp_dir() . '/' . Str::uuid() . '.jpg';

    $cmd = sprintf(
        '%s -ss 00:00:01 -i %s -vframes 1 -vf "scale=720:-2" -q:v 3 %s 2>&1',
        $ffmpeg,
        escapeshellarg($videoSource),
        escapeshellarg($tmpThumb)
    );

    exec($cmd, $output, $returnCode);

    if ($returnCode !== 0 || !file_exists($tmpThumb) || filesize($tmpThumb) === 0) {
        $cmdFallback = sprintf(
            '%s -ss 00:00:00 -i %s -vframes 1 -vf "scale=720:-2" -q:v 3 %s 2>&1',
            $ffmpeg,
            escapeshellarg($videoSource),
            escapeshellarg($tmpThumb)
        );
        exec($cmdFallback, $output2, $returnCode2);

        if ($returnCode2 !== 0 || !file_exists($tmpThumb) || filesize($tmpThumb) === 0) {
            Log::warning('ProcessVideoJob: thumbnail generation failed', [
                'source' => $videoSource,
                'output' => implode("\n", array_merge($output, $output2)),
            ]);
            return null;
        }
    }

    $key = 'thumbnails/' . now()->format('Y/m/d') . '/' . Str::uuid() . '.jpg';

    Storage::disk($disk)->put(
        $key,
        file_get_contents($tmpThumb),
        ['ContentType' => 'image/jpeg', 'visibility' => 'public']
    );

    @unlink($tmpThumb);

    Log::info("ProcessVideoJob: thumbnail uploaded → {$key}");

    return $key;
}

private function getDuration(string $videoSource): ?int
{
    $ffprobe = getenv('HOME') . '/bin/ffprobe';

    exec($ffprobe . ' -version 2>&1', $out, $code);
    if ($code !== 0) return null;

    $cmd = sprintf(
        '%s -v quiet -show_entries format=duration -of csv=p=0 %s 2>&1',
        $ffprobe,
        escapeshellarg($videoSource)
    );

    exec($cmd, $output, $returnCode);
    $duration = floatval(trim(implode('', $output)));

    return $duration > 0 ? (int) $duration : null;
}

    private function activateVideo(): void
    {
        $this->video->update([
            'status'       => 'active',
            'published_at' => now(),
        ]);
    }
}



