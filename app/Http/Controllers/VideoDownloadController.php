<?php

namespace App\Http\Controllers;

use App\Jobs\WatermarkVideoJob;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class VideoDownloadController extends Controller
{
    /**
     * POST /api/videos/{video}/download/prepare
     *
     * Kicks off the watermark job and returns a job_key the client
     * polls with. Returns immediately (non-blocking).
     *
     * Response:
     *   { job_key: "wm_abc123", status: "queued" }
     */
    public function prepare(Video $video): JsonResponse
    {
        // Rate-limit: one active job per user per video
        $cacheKey  = 'wm_' . $video->ulid . '_' . (auth()->id() ?? request()->ip());
        $existing  = Cache::get($cacheKey);

        // If already done and URL is fresh, return it immediately
        if ($existing && $existing['status'] === 'done') {
            return response()->json([
                'job_key' => $cacheKey,
                'status'  => 'done',
                'url'     => $existing['url'],
            ]);
        }

        // If already processing, tell the client to keep polling
        if ($existing && $existing['status'] === 'processing') {
            return response()->json(['job_key' => $cacheKey, 'status' => 'processing']);
        }

        // Output path on the storage disk (temp watermarked files)
        $outputPath = 'watermarked/' . $video->ulid . '_' . Str::random(8) . '.mp4';

        // Mark as processing before dispatching so duplicate requests are rejected
        Cache::put($cacheKey, ['status' => 'processing'], now()->addMinutes(10));

        WatermarkVideoJob::dispatch($video->load('user:id,username'), $cacheKey, $outputPath)
            ->onQueue('watermark'); // use a dedicated queue so it doesn't block other jobs

        return response()->json(['job_key' => $cacheKey, 'status' => 'queued'], 202);
    }

    /**
     * GET /api/videos/download/status?job_key={key}
     *
     * Client polls this every 2 seconds after calling prepare.
     *
     * Response:
     *   { status: "processing" | "done" | "error", url?: "...", message?: "..." }
     */
    public function status(Request $request): JsonResponse
    {
        $key    = $request->query('job_key');
        $result = Cache::get($key);

        if (!$result) {
            return response()->json(['status' => 'not_found'], 404);
        }

        return response()->json($result);
    }

    /**
     * DELETE /api/videos/download/cleanup?job_key={key}
     *
     * Optional: called after the browser starts the download to free storage.
     * Deletes the watermarked file and clears the cache entry.
     */
    public function cleanup(Request $request): JsonResponse
    {
        $key    = $request->query('job_key');
        $result = Cache::get($key);

        if ($result && isset($result['url'])) {
            // Extract storage path from URL and delete the file
            $disk = config('filesystems.default', 'public');
            try {
                $path = $this->urlToStoragePath($result['url'], $disk);
                if ($path) Storage::disk($disk)->delete($path);
            } catch (\Throwable) {}
        }

        Cache::forget($key);
        return response()->json(['ok' => true]);
    }

    private function urlToStoragePath(string $url, string $disk): ?string
    {
        $base = rtrim(Storage::disk($disk)->url(''), '/');
        if (str_starts_with($url, $base)) {
            return ltrim(substr($url, strlen($base)), '/');
        }
        return null;
    }
}