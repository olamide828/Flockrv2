<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessVideoJob;
use App\Models\Video;
use App\Services\FeedService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
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

    public function show(string $username, Video $video): Response
    {
        $video->loadMissing('user:id,name,username,avatar,is_verified,followers_count');

        if (!$video->user || $video->user->username !== $username) {
            abort(404);
        }

        if (in_array($video->status, ['processing', 'pending'])) {
            return Inertia::render('Video/Processing', ['video' => $video]);
        }

        abort_if($video->status !== 'active', 404);

        $video->load([
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

    public function store(Request $request): JsonResponse
    {
        if (!Auth::check() || Auth::user()->role !== 'seller') {
            return response()->json(['message' => 'Only sellers can upload videos.'], 403);
        }

        $request->validate([
            'video' => 'required|file|mimes:mp4,mov,webm,avi,mkv|max:512000',
            'title' => 'nullable|string|max:200',
            'description' => 'nullable|string|max:1000',
            'hashtags' => 'nullable|json',
        ], [
            'video.max' => 'Video must be under 500MB.',
            'video.mimes' => 'Only MP4, MOV, WebM, AVI and MKV files are allowed.',
            'video.file' => 'Please select a valid video file.',
        ]);

        $hashtags = json_decode($request->hashtags ?? '[]', true);
        $file = $request->file('video');
        $path = $this->storageService->uploadVideo($file);

        // ── Mark ACTIVE immediately so seller sees it right away ──────────────
        // ProcessVideoJob runs in background to generate thumbnail + duration.
        // If job fails the video stays active — just without a thumbnail.
        $video = Video::create([
            'user_id' => Auth::id(),
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'hashtags' => $hashtags,
            'video_url' => $path,
            'file_size_bytes' => $file->getSize(),
            'status' => 'active',       // ← active immediately
            'published_at' => now(),           // ← visible in feed now
        ]);

        // Dispatch background job to generate thumbnail + duration (non-blocking)
        if (class_exists(ProcessVideoJob::class)) {
            ProcessVideoJob::dispatch($video);
        }

        // Tag products
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
            'video_ulid' => $video->ulid,
            'status' => $video->status,
        ], 201);
    }

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

        $totalActive = Video::active()->count();
        $hasMore = $videos->count() === $limit && $totalActive > $limit;

        return response()->json([
            'data' => $serialized,
            'next_cursor' => $videos->last()?->id,
            'has_more' => $hasMore,
        ]);
    }

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

        return response()->json(['message' => 'Products tagged.', 'products' => $video->products]);
    }

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

    public function generateSummary(Video $video): JsonResponse
    {
        try {
            $hashtags = is_array($video->hashtags)
                ? $video->hashtags
                : json_decode($video->hashtags ?? '[]', true);

            $prompt = "Create an engaging summary for this video not more or less 150 words.
CRITICAL INSTRUCTION: Return ONLY the summary itself. No introductory phrases.

Title: {$video->title}
Description: {$video->description}
Hashtags: " . implode(', ', $hashtags);

            $response = Http::timeout(60)->post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' . env('GEMINI_API_KEY'),
                ['contents' => [['parts' => [['text' => $prompt]]]]]
            );

            if ($response->status() === 429) {
                return response()->json(['message' => 'AI limit reached. Try again in a minute.'], 429);
            }

            $content = data_get($response->json(), 'candidates.0.content.parts.0.text');

            if (!$content) {
                return response()->json(['message' => 'Gemini request failed.'], 500);
            }

            return response()->json(['summary' => trim($content)]);

        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}