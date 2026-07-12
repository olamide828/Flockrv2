<?php

namespace App\Http\Controllers;

use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaUploadController extends Controller
{
    public function store(Request $request, StorageService $storage): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|max:51200|mimes:jpg,jpeg,png,gif,webp,mp4,mov,webm,m4v',
            'type' => 'required|in:image,video',
        ]);

        $key = $storage->uploadCommunityMedia($request->file('file'), $validated['type']);

        return response()->json([
            'url'  => $storage->url($key),
            'type' => $validated['type'],
        ]);
    }
}