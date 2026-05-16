<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessVideoJob;
use App\Models\Video;
use App\Services\FeedService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class VideoController extends Controller
{
    public function __construct(
        private readonly FeedService $feedService,
        private readonly StorageService $storageService,
    ) {
    }

    // ── Inertia Pages ─────────────────────────────────────────────────────────

    /**
     * GET /  — TikTok-style feed
     */
    public function index(): Response
    {
        return Inertia::render('Feed/Index', [
            'initialVideos' => $this->feedService
                ->getForYouPage(userId: Auth::id(), limit: 5)
                ->each(fn($v) => $v->append(['video_stream_url', 'thumbnail_url_full']))
                ->values()
                ->toArray(),
        ]);
    }

    /**
     * GET /seller/upload
     */
    public function create(): Response
    {
        if (!Auth::check() || Auth::user()->role !== 'seller') {
            abort(403, 'Only sellers can upload videos.');
        }

        $products = Auth::user()
            ->products()
            ->where('status', 'active')
            ->get(['id', 'name', 'price', 'compare_price', 'stock_quantity', 'images']);

        return Inertia::render('Seller/Upload', [
            'products' => $products,
        ]);
    }

    /**
     * GET /video/{video}
     */
    public function show(Video $video): Response
    {
        if ($video->status === 'processing' || $video->status === 'pending') {
            return Inertia::render('Video/Processing', ['video' => $video]);
        }

        abort_if(!in_array($video->status, ['active']), 404);

        $video->load([
            'user:id,name,username,avatar,is_verified,followers_count',
            'products' => fn($q) => $q->where('status', 'active')
                ->with('seller:id,name,username'),
        ]);

        $video->loadCount(['likes', 'comments']);

        $isLiked = Auth::check() && $video->likes()->where('user_id', Auth::id())->exists();
        $isSaved = Auth::check() && $video->savedByUsers()->where('user_id', Auth::id())->exists();
        $isFollowing = Auth::check() && Auth::user()->isFollowing($video->user);

        return Inertia::render('Video/Show', [
            'video' => $video,
            'isLiked' => $isLiked,
            'isSaved' => $isSaved,
            'isFollowing' => $isFollowing,
        ]);
    }

    // ── API ───────────────────────────────────────────────────────────────────

    /**
     * POST /api/videos/upload
     */
    public function store(Request $request): JsonResponse
    {
        \Log::info('Upload request', [
            'user_id' => Auth::id(),
            'auth_check' => Auth::check(),
            'sanctum_user' => auth('sanctum')->user()?->id,
            'headers' => $request->headers->all(),
        ]);

        if (!Auth::check() || Auth::user()->role !== 'seller') {
            return response()->json(['message' => 'Only sellers can upload videos.'], 403);
        }

        \Log::info('Upload attempt', [
    'files'      => $request->allFiles(),
    'post_max'   => ini_get('post_max_size'),
    'upload_max' => ini_get('upload_max_filesize'),
    'content_length' => $request->header('Content-Length'),
    'content_type'   => $request->header('Content-Type'),
]);

        $request->validate([
            'video' => 'required|file|mimes:mp4,mov,webm,avi,mkv|max:512000',
            'title' => 'nullable|string|max:200',
            'description' => 'nullable|string|max:1000',
            'hashtags' => 'nullable|json',
        ], [
            'video.max' => 'Video must be under 500MB.',
            'video.mimes' => 'Only MP4, MOV, WebM, and AVI files are allowed.',
            'video.file' => 'Please select a valid video file.',
        ]);

        $hashtags = json_decode($request->hashtags, true);

        $file = $request->file('video');
        $path = $this->storageService->uploadVideo($file);

        $video = Video::create([
            'user_id' => Auth::id(),
            'title' => $request->input('title'),                            
            'description' => $request->input('description'),
            'hashtags' => $hashtags,
            'video_url' => $path,
            'file_size_bytes' => $file->getSize(),
            'status' => 'pending',
        ]);

        if (class_exists(ProcessVideoJob::class)) {
            ProcessVideoJob::dispatch($video);
        } else {
            $video->update(['status' => 'active', 'published_at' => now()]);
        }

        if ($request->filled('product_ids')) {
            $ids = json_decode($request->input('product_ids'), true) ?? [];
            if (!empty($ids)) {
                $video->products()->syncWithoutDetaching(
                    collect($ids)->mapWithKeys(fn($id) => [$id => ['sort_order' => 0]])->toArray()
                );
                $video->update(['is_for_sale' => true]);
            }
        }

        return response()->json([
            'message' => 'Video uploaded successfully.',
            'video_id' => $video->id,
            'status' => $video->status,
        ], 201);
    }

    /**
     * GET /api/feed
     */
    public function feed(Request $request): JsonResponse
    {
        $type = $request->input('type', 'for_you');
        $cursor = (int) $request->input('cursor', 0);
        $limit = min((int) $request->input('limit', 10), 20);

        $videos = match ($type) {
            'following' => $this->feedService->getFollowingFeed(Auth::id(), $cursor, $limit),
            default => $this->feedService->getForYouPage(Auth::id(), $limit, $cursor),
        };

        $serialized = $videos
            ->each(fn($v) => $v->append(['video_stream_url', 'thumbnail_url_full']))
            ->values()
            ->toArray();

        return response()->json([
            'data' => $serialized,
            'next_cursor' => $videos->last()?->id,
            'has_more' => $videos->count() === $limit,
        ]);
    }

    /**
     * POST /api/videos/{video}/like
     */
    public function like(Video $video): JsonResponse
    {
        $user = Auth::user();
        $liked = $video->likes()->where('user_id', $user->id)->exists();

        if ($liked) {
            $video->likes()->detach($user->id);
            $video->decrement('likes_count');
        } else {
            $video->likes()->attach($user->id);
            $video->increment('likes_count');
        }

        return response()->json([
            'liked' => !$liked,
            'likes_count' => $video->refresh()->likes_count,
        ]);
    }

    /**
     * POST /api/videos/{video}/view
     */
    public function recordView(Request $request, Video $video): JsonResponse
    {
        $validated = $request->validate([
            'watch_seconds' => 'required|integer|min:0',
            'session_id' => 'nullable|string|max:64',
        ]);

        $video->recordView(
            userId: Auth::id(),
            sessionId: $validated['session_id'] ?? session()->getId(),
            watchSeconds: $validated['watch_seconds'],
        );

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/videos/{video}/save
     */
    public function save(Video $video): JsonResponse
    {
        $user = Auth::user();
        $saved = $video->savedByUsers()->where('user_id', $user->id)->exists();

        if ($saved) {
            $video->savedByUsers()->detach($user->id);
            $video->decrement('saves_count');
        } else {
            $video->savedByUsers()->attach($user->id);
            $video->increment('saves_count');
        }

        return response()->json([
            'saved' => !$saved,
            'saves_count' => $video->refresh()->saves_count,
        ]);
    }

    /**
     * POST /api/videos/{video}/tag-products
     */
    public function tagProducts(Request $request, Video $video): JsonResponse
    {
        if (Auth::id() !== $video->user_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'product_ids' => 'required|array',
            'product_ids.*' => 'integer|exists:products,id',
        ]);

        $video->products()->syncWithoutDetaching(
            collect($validated['product_ids'])
                ->mapWithKeys(fn($id) => [$id => ['sort_order' => 0]])
                ->toArray()
        );

        $video->update(['is_for_sale' => true]);

        return response()->json(['message' => 'Products tagged.']);
    }

    /**
     * DELETE /api/videos/{video}
     */
    public function destroy(Video $video): JsonResponse
    {
        if (Auth::id() !== $video->user_id && !Auth::user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $this->storageService->delete($video->video_url);
        if ($video->thumbnail_url) {
            $this->storageService->delete($video->thumbnail_url);
        }
        $video->delete();

        return response()->json(['message' => 'Video deleted.']);
    }
}