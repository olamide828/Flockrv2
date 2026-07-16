<?php

namespace App\Http\Controllers;

use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaUploadController extends Controller
{
    /**
     * Generic media upload used by the community Post composer, room chat
     * image/video messages, and room avatar uploads.
     *
     * IMPORTANT: raising this Laravel-side limit to 100MB is not enough on
     * its own. PHP itself will silently reject (or truncate) uploads bigger
     * than your php.ini's upload_max_filesize / post_max_size — by default
     * those are often as low as 2M on a fresh install, which is almost
     * certainly why your 40MB video 422'd ("file" came through as missing
     * because PHP dropped it before Laravel's validator ever saw it).
     *
     * In php.ini, set (then restart php artisan serve / your web server):
     *   upload_max_filesize = 100M
     *   post_max_size = 105M   (must be >= upload_max_filesize)
     */
    public function store(Request $request, StorageService $storage): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|max:102400|mimes:jpg,jpeg,png,gif,webp,mp4,mov,webm,m4v',
            'type' => 'required|in:image,video',
        ], [
            'file.required' => 'No file was received by the server — this usually means it exceeds your php.ini upload limit.',
            'file.max'      => 'File is too large. Maximum size is 100MB.',
        ]);

        $key = $storage->uploadCommunityMedia($request->file('file'), $validated['type']);

        return response()->json([
            'url'  => $storage->url($key),
            'type' => $validated['type'],
        ]);
    }
}