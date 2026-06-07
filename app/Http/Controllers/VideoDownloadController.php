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
     * CACHE KEY FIX: Every request gets a fresh unique key.
     * Previously the key was based on ulid+userId — so the second download
     * of the same video would find the old "done" cache entry, try to serve
     * a temp file that had already been deleted, and fail instantly.
     *
     * Now each request generates a new UUID-based key. Old entries expire
     * naturally via their 30-minute TTL.
     */
    public function prepare(Video $video): JsonResponse
    {
        // Generate a fresh unique key for every download request
        $cacheKey   = 'wm_' . Str::uuid();
        $outputPath = 'watermarked/' . $video->ulid . '_' . Str::random(8) . '.mp4';

        // Mark as processing immediately so duplicate rapid clicks don't double-dispatch
        Cache::put($cacheKey, ['status' => 'processing'], now()->addMinutes(10));

        WatermarkVideoJob::dispatch(
            $video->load('user:id,username'),
            $cacheKey,
            $outputPath
        )->onQueue('watermark');

        return response()->json([
            'job_key' => $cacheKey,
            'status'  => 'queued',
        ], 202);
    }

    /**
     * GET /api/videos/download/status?job_key=...
     * Polled every 2s by the frontend until status === 'done' or 'error'.
     */
    public function status(Request $request): JsonResponse
    {
        $key    = $request->query('job_key');
        $result = Cache::get($key);

        if (!$result) {
            // Key expired or never existed — tell frontend to stop polling
            return response()->json(['status' => 'not_found'], 404);
        }

        return response()->json($result);
    }

    /**
     * DELETE /api/videos/download/cleanup?job_key=...
     * Called after browser starts downloading to free up storage space.
     */
    public function cleanup(Request $request): JsonResponse
    {
        $key    = $request->query('job_key');
        $result = Cache::get($key);

        if ($result && isset($result['url'])) {
            try {
                $disk = config('filesystems.default', 'public');
                $base = rtrim(Storage::disk($disk)->url(''), '/');
                $url  = $result['url'];
                if (str_starts_with($url, $base)) {
                    Storage::disk($disk)->delete(ltrim(substr($url, strlen($base)), '/'));
                }
            } catch (\Throwable) {}
        }

        Cache::forget($key);
        return response()->json(['ok' => true]);
    }
}