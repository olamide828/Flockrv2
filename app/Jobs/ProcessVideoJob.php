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

    public int $timeout = 600;
    // One attempt only: every attempt re-encodes the whole video, and a second one used to push the job past
    // the queue's retry_after window, which is what produced "attempted too many times".
    public int $tries   = 1;

    // Longest side capped at 1280 (portrait 1080x1920 becomes 720x1280, landscape 1920x1080 becomes 1280x720),
    // never upscaled. The old filters left portrait videos at full 1080x1920 for the MP4 and shrank the HLS
    // stream to 406x720 (blurry), while using far more CPU and memory than needed.
    private const LONG_SIDE_1280 = "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'";

    public function __construct(public Video $video) {}

    /**
     * Run ffmpeg at low priority so encoding never starves web requests on the same machine
     * (a starved web process is what shows up as 503s while a video is processing).
     */
    private function ffBin(string $ffmpeg): string
    {
        foreach (['/usr/bin/nice', '/bin/nice'] as $nice) {
            if (is_executable($nice)) return $nice . ' -n 15 ' . $ffmpeg;
        }
        return $ffmpeg;
    }

    public function handle(): void
    {
        $videoSource = null;
        try {
            // Do NOT flip the video to "processing": it is already live (VideoController publishes on upload),
            // and everything below is an upgrade, so viewers never see a processing screen.
            $t0 = microtime(true);
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

            // ── Thumbnail + duration, then PUBLISH straight away ───────────────
            // The original upload already plays, so the video goes live now; the optimised MP4 and the HLS
            // stream below are upgrades that get swapped in when they are ready.
            $thumbnailKey = $this->generateThumbnail($videoSource, $disk);
            $duration     = $this->getDuration($videoSource);
            Log::info("ProcessVideoJob #{$this->video->id}: thumbnail ready", ['seconds' => round(microtime(true) - $t0, 1)]);

            $this->video->update(array_filter([
                'status'           => 'active',
                'published_at'     => now(),
                'thumbnail_url'    => $thumbnailKey,
                'duration_seconds' => $duration,
            ], fn($v) => $v !== null));

            // ── Upgrades (each one is optional: a failure just keeps the original) ──
            $optimizedKey = null;
            $hlsKey       = null;
            try { $optimizedKey = $this->optimizeForStreaming($videoSource, $disk); } catch (\Throwable $e) { Log::warning("ProcessVideoJob: optimise failed for #{$this->video->id}: " . $e->getMessage()); }
            Log::info("ProcessVideoJob #{$this->video->id}: optimised mp4", ['seconds' => round(microtime(true) - $t0, 1), 'ok' => (bool) $optimizedKey]);
            try { $hlsKey = $this->generateHls($videoSource, $disk); } catch (\Throwable $e) { Log::warning("ProcessVideoJob: HLS failed for #{$this->video->id}: " . $e->getMessage()); }

            $this->video->update(array_filter([
                'video_url' => $optimizedKey,
                'hls_url'   => $hlsKey,
            ], fn($v) => $v !== null));

            Log::info("ProcessVideoJob: video #{$this->video->id} done", [
                'thumbnail' => $thumbnailKey,
                'duration'  => $duration,
                'seconds'   => round(microtime(true) - $t0, 1),
            ]);

        } catch (\Throwable $e) {
            Log::error("ProcessVideoJob failed for #{$this->video->id}: " . $e->getMessage());
            $this->activateVideo(); // always activate so video isn't stuck
        } finally {
            // downloadToTemp() leaves a full copy of the video in /tmp; remove it so the worker's disk doesn't fill up
            if (!empty($videoSource) && str_starts_with($videoSource, sys_get_temp_dir()) && is_file($videoSource)) {
                @unlink($videoSource);
            }
        }
    }

    /** Called by the queue when the job is killed or runs out of attempts: never leave the video on "processing". */
    public function failed(\Throwable $e): void
    {
        Log::error("ProcessVideoJob gave up for #{$this->video->id}: " . $e->getMessage());
        $this->activateVideo();
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
       
            return $this->downloadToTemp($disk, $key);
        

    }

    /**
     * Fallback: download video to a temp file if no public URL is available.
     * Only used when R2/S3 bucket is private with no CDN URL.
     */
    private function downloadToTemp(string $disk, string $key): ?string
    {
        try {
            Log::info("ProcessVideoJob: downloading video to temp (no CDN URL configured)");
            // Stream to disk: loading a 60MB video into PHP memory can exceed memory_limit and kill the worker
            // mid-job, which is exactly what ends in "attempted too many times".
            $in = Storage::disk($disk)->readStream($key);
            if (!is_resource($in)) return null;

            $ext     = pathinfo($key, PATHINFO_EXTENSION) ?: 'mp4';
            $tmpPath = sys_get_temp_dir() . '/' . Str::uuid() . '.' . $ext;
            $out     = fopen($tmpPath, 'wb');
            stream_copy_to_stream($in, $out);
            fclose($out);
            fclose($in);
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
    $ffmpeg = config('flockr.ffmpeg_path');

    exec($ffmpeg . ' -version 2>&1', $out, $code);
    if ($code !== 0) {
         Log::warning('ProcessVideoJob: ffmpeg not found — skipping thumbnail', [
        'exit_code' => $code,
        'output'    => implode("\n", $out),
    ]);
        return null;
    }

    $tmpThumb = sys_get_temp_dir() . '/' . Str::uuid() . '.jpg';

    $cmd = sprintf(
        '%s -hide_banner -nostats -loglevel error -ss 00:00:01 -i %s -vframes 1 -vf "scale=720:-2" -q:v 3 %s 2>&1',
        $this->ffBin($ffmpeg),
        escapeshellarg($videoSource),
        escapeshellarg($tmpThumb)
    );

    exec($cmd, $output, $returnCode);

    if ($returnCode !== 0 || !file_exists($tmpThumb) || filesize($tmpThumb) === 0) {
        $cmdFallback = sprintf(
            '%s -hide_banner -nostats -loglevel error -ss 00:00:00 -i %s -vframes 1 -vf "scale=720:-2" -q:v 3 %s 2>&1',
            $this->ffBin($ffmpeg),
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

    $h = fopen($tmpThumb, 'rb');
    Storage::disk($disk)->put($key, $h, ['ContentType' => 'image/jpeg', 'visibility' => 'public']);
    if (is_resource($h)) fclose($h);

    @unlink($tmpThumb);

    Log::info("ProcessVideoJob: thumbnail uploaded → {$key}");

    return $key;
}

private function getDuration(string $videoSource): ?int
{
    $ffprobe = config('flockr.ffprobe_path');

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
    
    private function optimizeForStreaming(string $videoSource, string $disk): ?string
{
    $ffmpeg = config('flockr.ffmpeg_path');

    exec($ffmpeg . ' -version 2>&1', $out, $code);
    if ($code !== 0) return null;

    $tmpOut = sys_get_temp_dir() . '/' . Str::uuid() . '.mp4';

    // -movflags +faststart moves metadata to the front of the file so
    // playback can begin before the whole file has downloaded — this is
    // the single biggest fix for the "video sits there buffering" problem.
    // -crf 23 / scale caps bitrate and resolution so nothing oversized
    // gets served untouched.
    $cmd = sprintf(
        '%s -hide_banner -nostats -loglevel error -i %s -threads 2 -c:v libx264 -preset veryfast -crf 23 -vf %s -c:a aac -b:a 128k -movflags +faststart -y %s 2>&1',
        $this->ffBin($ffmpeg),
        escapeshellarg($videoSource),
        escapeshellarg(self::LONG_SIDE_1280),
        escapeshellarg($tmpOut)
    );

    exec($cmd, $output, $returnCode);

    if ($returnCode !== 0 || !file_exists($tmpOut) || filesize($tmpOut) === 0) {
        Log::warning('ProcessVideoJob: streaming optimization failed, keeping original', [
            'output' => implode("\n", $output),
        ]);
        return null;
    }

    $key = 'videos/' . now()->format('Y/m/d') . '/' . Str::uuid() . '.mp4';

    $h = fopen($tmpOut, 'rb');
    Storage::disk($disk)->put($key, $h, ['ContentType' => 'video/mp4', 'visibility' => 'public']);
    if (is_resource($h)) fclose($h);

    @unlink($tmpOut);

    return $key;
}

    private function generateHls(string $videoSource, string $disk): ?string
    {
        $ffmpeg = config('flockr.ffmpeg_path');

        exec($ffmpeg . ' -version 2>&1', $out, $code);
        if ($code !== 0) return null;

        $tmpDir = sys_get_temp_dir() . '/hls-' . Str::uuid();
        mkdir($tmpDir, 0755, true);
        $playlist = $tmpDir . '/index.m3u8';

        $cmd = sprintf(
            '%s -hide_banner -nostats -loglevel error -i %s -threads 2 -vf %s -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -hls_time 6 -hls_list_size 0 -hls_flags independent_segments -hls_segment_filename %s -f hls %s -y 2>&1',
            $this->ffBin($ffmpeg),
            escapeshellarg($videoSource),
            escapeshellarg(self::LONG_SIDE_1280),
            escapeshellarg($tmpDir . '/seg_%03d.ts'),
            escapeshellarg($playlist)
        );

        exec($cmd, $output, $returnCode);

        if ($returnCode !== 0 || !file_exists($playlist)) {
            Log::warning('ProcessVideoJob: HLS generation failed', ['output' => implode("\n", $output)]);
            $this->cleanupTmpDir($tmpDir);
            return null;
        }

        $prefix = 'hls/' . now()->format('Y/m/d') . '/' . Str::uuid();

        foreach (glob($tmpDir . '/*') as $file) {
            $filename    = basename($file);
            $contentType = str_ends_with($filename, '.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
            $h = fopen($file, 'rb');
            Storage::disk($disk)->put("{$prefix}/{$filename}", $h, [
                'ContentType' => $contentType, 'visibility' => 'public',
            ]);
            if (is_resource($h)) fclose($h);
        }

        $this->cleanupTmpDir($tmpDir);

        return "{$prefix}/index.m3u8";
    }

    private function cleanupTmpDir(string $dir): void
    {
        foreach (glob($dir . '/*') as $file) { @unlink($file); }
        @rmdir($dir);
    }

}



