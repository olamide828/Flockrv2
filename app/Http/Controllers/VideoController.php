<?php

namespace App\Http\Controllers;

use App\Http\Requests\VideoUploadRequest;
use App\Jobs\ProcessVideoJob;
use App\Models\Video;
use App\Models\VideoView;
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
        private readonly FeedService    $feedService,
        private readonly StorageService $storageService,
    ) {}

    // ─── Pages (Inertia) ─────────────────────────────────────────────────────

    /**
     * GET /  — main TikTok-style feed page
     */
    public function index(): Response
    {
        return Inertia::render('Feed/Index', [
            'initialVideos' => $this->feedService->getForYouPage(
                userId: Auth::id(),
                limit: 5
            ),
        ]);
    }

    /**
     * GET /upload  — upload form
     */
    public function create(): Response
    {
        $this->authorize('create', Video::class);
        return Inertia::render('Video/Upload');
    }

    /**
     * GET /video/{video}  — single video page
     */
    public function show(Video $video): Response
    {
        abort_if($video->status !== 'active', 404);

        $video->load([
            'user:id,name,username,avatar,is_verified,followers_count',
            'products' => fn ($q) => $q->active()->with('seller:id,name'),
        ]);

        $video->loadCount(['likes', 'comments']);

        $isLiked = Auth::check() && $video->likes()->where('user_id', Auth::id())->exists();
        $isSaved = Auth::check() && $video->savedByUsers()->where('user_id', Auth::id())->exists();

        return Inertia::render('Video/Show', [
            'video'   => $video,
            'isLiked' => $isLiked,
            'isSaved' => $isSaved,
        ]);
    }

    // ─── API (JSON) ───────────────────────────────────────────────────────────

    /**
     * POST /api/videos/upload
     * Step 1: Receive raw file → upload to R2 → queue processing jobs.
     */
    public function store(VideoUploadRequest $request): JsonResponse
    {
        $file = $request->file('video');

        // Upload raw video to R2 under a tmp/ prefix
        $path = $this->storageService->uploadVideo($file);

        $video = Video::create([
            'user_id'         => Auth::id(),
            'title'           => $request->input('title'),
            'description'     => $request->input('description'),
            'video_url'       => $path,
            'file_size_bytes' => $file->getSize(),
            'status'          => 'pending',
        ]);

        // Dispatch background pipeline: transcode → whisper captions → embeddings
        ProcessVideoJob::dispatch($video);

        return response()->json([
            'message'  => 'Video uploaded. Processing will complete shortly.',
            'video_id' => $video->id,
            'status'   => $video->status,
        ], 201);
    }

    /**
     * GET /api/feed?cursor={id}&type={for_you|following}
     * Infinite scroll — returns next batch of videos.
     */
    public function feed(Request $request): JsonResponse
    {
        $type   = $request->input('type', 'for_you');   // for_you | following
        $cursor = (int) $request->input('cursor', 0);
        $limit  = min((int) $request->input('limit', 10), 20);

        $videos = match ($type) {
            'following' => $this->feedService->getFollowingFeed(Auth::id(), $cursor, $limit),
            default     => $this->feedService->getForYouPage(Auth::id(), $limit, $cursor),
        };

        return response()->json([
            'data'        => $videos,
            'next_cursor' => $videos->last()?->id,
            'has_more'    => $videos->count() === $limit,
        ]);
    }

    /**
     * POST /api/videos/{video}/like  — toggle like
     */
    public function like(Video $video): JsonResponse
    {
        $user  = Auth::user();
        $liked = $video->likes()->where('user_id', $user->id)->exists();

        if ($liked) {
            $video->likes()->detach($user->id);
            $video->decrement('likes_count');
        } else {
            $video->likes()->attach($user->id);
            $video->increment('likes_count');
        }

        return response()->json([
            'liked'       => !$liked,
            'likes_count' => $video->refresh()->likes_count,
        ]);
    }

    /**
     * POST /api/videos/{video}/view  — record watch progress
     */
    public function recordView(Request $request, Video $video): JsonResponse
    {
        $validated = $request->validate([
            'watch_seconds' => 'required|integer|min:0',
            'session_id'    => 'nullable|string|max:64',
        ]);

        $video->recordView(
            userId:       Auth::id(),
            sessionId:    $validated['session_id'] ?? session()->getId(),
            watchSeconds: $validated['watch_seconds'],
        );

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/videos/{video}/save  — toggle save
     */
    public function save(Video $video): JsonResponse
    {
        $user  = Auth::user();
        $saved = $video->savedByUsers()->where('user_id', $user->id)->exists();

        if ($saved) {
            $video->savedByUsers()->detach($user->id);
            $video->decrement('saves_count');
        } else {
            $video->savedByUsers()->attach($user->id);
            $video->increment('saves_count');
        }

        return response()->json(['saved' => !$saved, 'saves_count' => $video->refresh()->saves_count]);
    }

    /**
     * DELETE /api/videos/{video}
     */
    public function destroy(Video $video): JsonResponse
    {
        $this->authorize('delete', $video);
        $this->storageService->delete($video->video_url);
        if ($video->thumbnail_url) $this->storageService->delete($video->thumbnail_url);
        $video->delete();

        return response()->json(['message' => 'Video deleted.']);
    }
}
