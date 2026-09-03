<?php

namespace App\Http\Controllers;

use App\Models\ChatWallpaper;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChatWallpaperController extends Controller
{
    public function __construct(private readonly StorageService $storage) {}

    private function assertProSeller(): void
    {
        $user = Auth::user();
        abort_unless($user->role === 'seller' && $user->hasActiveSubscription(), 403, 'Custom wallpapers are a Flockr Pro feature for sellers.');
    }

    public function index(): JsonResponse
    {
        $wallpapers = ChatWallpaper::where('user_id', Auth::id())->latest()->get();
        return response()->json($wallpapers->map(fn($w) => [
            'id'         => $w->id,
            'url'        => $this->storage->url($w->image_path),
            'created_at' => $w->created_at,
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertProSeller();
        $request->validate(['image' => 'required|image|mimes:jpg,jpeg,png,webp|max:8192']);

        $key = $this->storage->uploadImage($request->file('image'), 'chat_wallpapers');
        $wallpaper = ChatWallpaper::create(['user_id' => Auth::id(), 'image_path' => $key]);

        return response()->json([
            'id'         => $wallpaper->id,
            'url'        => $this->storage->url($key),
            'created_at' => $wallpaper->created_at,
        ], 201);
    }

    public function destroy(ChatWallpaper $wallpaper): JsonResponse
    {
        abort_unless($wallpaper->user_id === Auth::id(), 403);
        $this->storage->delete($wallpaper->image_path);
        $wallpaper->delete();
        return response()->json(['ok' => true]);
    }
}