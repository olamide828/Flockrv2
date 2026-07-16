<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessVideoJob;
use App\Models\Product;
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

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Serialize a collection of videos for API responses.
     * Normalises comments_count to include replies (all_comments_count).
     */

    private function serializeVideos($videos): array
    {
        if ($videos->isEmpty()) return [];

        $userId    = Auth::id();
        $videoIds  = $videos->pluck('id')->filter()->unique()->toArray();
        $sellerIds = $videos->pluck('user_id')->filter()->unique()->toArray();

        // ── NEW: Batch-fetch per-user flags in 3 queries total ────────────────
        // Previously these defaulted to false on every request.
        // Now we look them up once for the whole batch before the map.
        $likedIds     = [];
        $savedIds     = [];
        $followingIds = [];

        if ($userId && !empty($videoIds)) {
            $likedIds = \DB::table('video_likes')
                ->where('user_id', $userId)
                ->whereIn('video_id', $videoIds)
                ->pluck('video_id')
                ->flip()   // flip to [video_id => 0] for O(1) isset() lookup
                ->toArray();

            $savedIds = \DB::table('video_saves')
                ->where('user_id', $userId)
                ->whereIn('video_id', $videoIds)
                ->pluck('video_id')
                ->flip()
                ->toArray();

            if (!empty($sellerIds)) {
                $followingIds = \DB::table('follows')
                    ->where('follower_id', $userId)
                    ->whereIn('following_id', $sellerIds)
                    ->pluck('following_id')
                    ->flip()
                    ->toArray();
            }
        }
        // ── END NEW ───────────────────────────────────────────────────────────

        return $videos
            ->map(function ($v) use ($likedIds, $savedIds, $followingIds) {
                // ── UNCHANGED: your existing guard ────────────────────────────
                if (!is_object($v)) return null;

                // ── UNCHANGED: your existing Eloquent/array conversion ────────
                $arr = ($v instanceof \Illuminate\Database\Eloquent\Model)
                    ? $v->toArray()
                    : (array) $v;

                // ── UNCHANGED: your existing URL accessors ────────────────────
                $arr['video_stream_url']   = ($v instanceof \Illuminate\Database\Eloquent\Model)
                    ? $v->video_stream_url
                    : ($arr['video_stream_url'] ?? null);

                $arr['thumbnail_url_full'] = ($v instanceof \Illuminate\Database\Eloquent\Model)
                    ? $v->thumbnail_url_full
                    : ($arr['thumbnail_url_full'] ?? null);

                // ── UNCHANGED: your existing comments_count normalisation ─────
                $arr['comments_count'] = $v->all_comments_count ?? $v->comments_count ?? 0;

                // ── CHANGED: was ?? false, now uses batch lookup ───────────────
                // Old: $arr['is_liked'] = $arr['is_liked'] ?? false;
                // New: look up from the pre-fetched sets above
                $videoId  = $arr['id']      ?? null;
                $sellerId = $arr['user_id'] ?? null;

                $arr['is_liked']     = $videoId  ? isset($likedIds[$videoId])     : false;
                $arr['is_saved']     = $videoId  ? isset($savedIds[$videoId])      : false;
                $arr['is_following'] = $sellerId ? isset($followingIds[$sellerId]) : false;

                return $arr;
            })
            ->filter() // ── UNCHANGED: your existing null filter ───────────────
            ->values()
            ->toArray();
    }

    // ── Inertia Pages ─────────────────────────────────────────────────────────

    public function index(): Response
    {
        return Inertia::render('Feed/Index', [
            'initialVideos' => $this->serializeVideos(
                $this->feedService->getForYouPage(userId: Auth::id(), limit: 5)
            ),
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

        return Inertia::render('Seller/Upload', ['products' => $products]);
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

        // Use allComments to count replies too
        $video->loadCount(['allComments']);

        $isLiked = Auth::check() && $video->likes()->where('user_id', Auth::id())->exists();
        $isSaved = Auth::check() && $video->savedByUsers()->where('user_id', Auth::id())->exists();
        $isFollowing = Auth::check() && Auth::user()->isFollowing($video->user);

        // Initial batch of seller's other videos
        $sellerVideos = Video::active()
    ->where('user_id', $video->user_id)
    ->where('id', '!=', $video->id)
    ->with([
        'user:id,name,username,avatar,is_verified,location',
        'products' => fn($q) => $q->where('status', 'active')->with('seller:id,name,username'),
    ])
    ->withCount(['allComments'])
    ->latest()
    ->limit(10)
    ->get();

        return Inertia::render('Video/Show', [
            'video' => array_merge($video->toArray(), [
                // Normalise: always send comments_count = all comments including replies
                'comments_count' => $video->all_comments_count ?? 0,
            ]),
            'isLiked' => $isLiked,
            'isSaved' => $isSaved,
            'isFollowing' => $isFollowing,
            'initialSellerVideos' => $this->serializeVideos($sellerVideos),
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
            'hashtags' => 'nullable|string',
            'text_overlays'      => 'nullable|string',  // JSON string
            'duration_seconds'   => 'nullable|integer|min:1',
        ], [
            'video.max' => 'Video must be under 500MB.',
            'video.mimes' => 'Only MP4, MOV, WebM, AVI and MKV files are allowed.',
            'video.file' => 'Please select a valid video file.',
        ]);

       
$hashtags = $request->filled('hashtags')
    ? array_filter(array_map('trim', preg_split('/[\s,#]+/', $request->hashtags)))
    : [];
        $file = $request->file('video');
        $path = $this->storageService->uploadVideo($file);

        $video = Video::create([
            'user_id' => Auth::id(),
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'hashtags' => $hashtags,
            'video_url' => $path,
            'file_size_bytes' => $file->getSize(),
            'status' => 'active',
            'published_at' => now(),
        ]);

        if ($request->has('text_overlays')) {
    $decoded = json_decode($request->input('text_overlays', '[]'), true);
    if (is_array($decoded) && count($decoded) > 0) {
        $video->update(['text_overlays' => $decoded]);
    }
}

        if ($request->filled('duration_seconds')) {
        $video->update(['duration_seconds' => (int) $request->duration_seconds]);
        }

        // After video is activated — notify followers
        $seller = Auth::user();
        $seller->followers()->chunk(100, function ($followers) use ($video) {
            foreach ($followers as $follower) {
                $follower->notify(new \App\Notifications\NewVideoNotification($video));
            }
        });

        if (class_exists(ProcessVideoJob::class)) {
            ProcessVideoJob::dispatch($video);
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
            'video_ulid' => $video->ulid,
            'status' => $video->status,
        ], 201);
    }

    public function feed(Request $request): JsonResponse
    {
        $type      = $request->input('type', 'for_you');
        $cursor    = (int) $request->input('cursor', 0);
        $limit     = min((int) $request->input('limit', 10), 20);
        $sessionId = $request->cookie('flockr_sid') ?? $request->header('X-Session-ID');
 
        // Seller feed
        if ($type === 'seller') {
            $sellerId    = (int) $request->input('seller_id');
            $excludeUlid = $request->input('exclude_ulid');
            if (!$sellerId) return response()->json(['data' => [], 'has_more' => false]);
 
            $query = Video::active()
    ->with([
        'user:id,name,username,avatar,is_verified,location',
        'products' => fn($q) => $q->where('status', 'active')->with('seller:id,name,username'),
    ])
    ->withCount(['allComments']);
            if ($excludeUlid) $query->where('ulid', '!=', $excludeUlid);
 
            $sellerVideos = $query->where('user_id', $sellerId)->latest()->skip($cursor)->limit($limit)->get();
            $hasMore      = Video::active()->where('user_id', $sellerId)->when($excludeUlid, fn ($q) => $q->where('ulid', '!=', $excludeUlid))->count() > ($cursor + $sellerVideos->count());
 
            $needed = $limit - $sellerVideos->count();
            $random = collect();
            if ($needed > 0) {
                $excludeIds = $sellerVideos->pluck('id')->toArray();
                if ($excludeUlid) {
                    $mainId = Video::where('ulid', $excludeUlid)->value('id');
                    if ($mainId) $excludeIds[] = $mainId;
                }
                $random = Video::active()
                    ->where('user_id', '!=', $sellerId)
                    ->whereNotIn('id', array_filter($excludeIds))
                    ->with(['user:id,name,username,avatar,is_verified,location', 
                    'products' => fn($q) => $q->with('seller:id,name,username,avatar,is_verified'),
                    ])
                    ->withCount(['allComments'])
                    ->inRandomOrder()
                    ->limit($needed)
                    ->get();
            }
 
            return response()->json([
                'data'     => $this->serializeVideos($sellerVideos->concat($random)),
                'has_more' => $hasMore,
            ]);
        }
 
        // Explore feed
        if ($type === 'explore') {
            $q     = trim($request->input('q', ''));
            $query = Video::active()
    ->with([
        'user:id,name,username,avatar,is_verified,location',
        'products' => fn($q) => $q->where('status', 'active')->with('seller:id,name,username'),
    ])
    ->withCount(['allComments']);
            if ($q) {
                $query->where(fn ($qb) =>
                    $qb->where('title', 'ilike', "%{$q}%")
                       ->orWhere('description', 'ilike', "%{$q}%")
                       ->orWhereRaw("hashtags::text ilike ?", ["%{$q}%"])
                );
            } else {
                $query->orderByDesc('views_count');
            }
            $videos = $query->skip($cursor)->limit($limit)->get();
            return response()->json(['data' => $this->serializeVideos($videos), 'has_more' => $videos->count() === $limit]);
        }
 
        // Standard feeds
$videos = match ($type) {
    'following' => $this->feedService->getFollowingFeed(Auth::id(), $cursor, $limit),
    default     => $this->feedService->getForYouPage(Auth::id(), $limit, $cursor, $sessionId),
};

return response()->json([
    'data'        => $this->serializeVideos($videos),
    'next_cursor' => $videos->last() ? (is_array($videos->last()) ? $videos->last()['id'] : $videos->last()->id) : null,
    'has_more'    => $videos->count() === $limit,
]);
    }

    public function like(Video $video): JsonResponse
    {
        $user = Auth::user();
        $liked = $video->likes()->where('user_id', $user->id)->exists();

        if ($liked) {
            $video->likes()->detach($user->id);
            $video->decrement('likes_count');
            // Unlike is a weak negative signal — don't penalise heavily
        } else {
            $video->likes()->attach($user->id);
            $video->increment('likes_count');

            // Notify seller (existing behaviour)
            if ($video->user_id !== $user->id) {
                try {
                    $video->user->notify(new \App\Notifications\NewLikeNotification($user, $video));
                } catch (\Throwable) {
                }
            }

            // Record for personalization — like is a medium positive signal
            $this->feedService->recordEvent('video_share', $video, $user->id);
            // (We use 'video_share' weight class for likes to avoid overweighting)
        }

        return response()->json([
            'liked' => !$liked,
            'likes_count' => $video->refresh()->likes_count,
        ]);
    }

    /**
     * POST /api/videos/{video}/save
     *
     * Added: records feed event (save = strong interest signal).
     */


    public function recordView(Request $request, Video $video): JsonResponse
    {
        $validated = $request->validate([
            'watch_seconds' => 'required|integer|min:0',
            'session_id'    => 'nullable|string|max:64',
            'event'         => 'nullable|string|in:skip,complete,rewatch', // new optional field
        ]);
 
        $video->recordView(
            userId:       Auth::id(),
            sessionId:    $validated['session_id'] ?? session()->getId(),
            watchSeconds: $validated['watch_seconds'],
        );
 
        // Determine event from watch behaviour
        $watchSeconds = $validated['watch_seconds'];
        $duration     = $video->duration_seconds ?? 30;
        $watchPct     = $duration > 0 ? ($watchSeconds / $duration) * 100 : 50;
        $explicitEvent = $validated['event'] ?? null;
 
        $feedEvent = match (true) {
            $explicitEvent === 'rewatch'    => 'video_rewatch',
            $explicitEvent === 'skip'       => 'video_skip',
            $explicitEvent === 'complete'   => 'video_complete',
            $watchPct >= 80                 => 'video_complete',  // watched ≥80% = completion
            $watchSeconds < 2               => 'video_skip',      // < 2s = skip
            default                         => null,              // normal view, no special event
        };
 
        if ($feedEvent) {
            $this->feedService->recordEvent(
                event:     $feedEvent,
                video:     $video,
                userId:    Auth::id(),
                sessionId: $validated['session_id'] ?? session()->getId(),
                meta:      ['watch_seconds' => $watchSeconds, 'watch_percent' => $watchPct],
            );
        }
 
        return response()->json(['ok' => true]);
    }

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
 
            // Save = product wishlist intent — strong commerce signal
            $this->feedService->recordEvent('product_wishlist', $video, $user->id);
        }
 
        return response()->json([
            'saved'       => !$saved,
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

    public function generateSummary(Video $video, Product $product): JsonResponse
    {
        try {
            $hashtags = is_array($video->hashtags)
                ? $video->hashtags
                : json_decode($video->hashtags ?? '[]', true);

            $prompt = "Create an engaging summary for this video not more than 50 words.
CRITICAL INSTRUCTION: Return ONLY the summary itself. No introductory phrases. If there is no video title, description or hashtags check for the product's title, price and description and give a summary on that.

Product Name: {$product->name}
Description: {$product->description}
Price: {$product->price}

Title: {$video->title}
Description: {$video->description}
Hashtags: " . implode(', ', $hashtags);



            $response = Http::timeout(60)->post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' . env('GEMINI_API_KEY'),
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

    public function report(Request $request, Video $video): JsonResponse
{
    // Can't report your own video
    if (Auth::id() === $video->user_id) {
        return response()->json(['message' => 'You cannot report your own video.'], 422);
    }

    $request->validate([
        'reason'      => 'required|string|max:200',
        'description' => 'nullable|string|max:500',
    ]);

    \App\Models\Report::upsertReport(
    reporterId: Auth::id(),
    reportedId: $video->user_id,
    reason:     "[Video: {$video->ulid}] {$request->reason}" . ($request->description ? " — {$request->description}" : ''),
    context:    []
);

return response()->json(['message' => 'Report submitted.']);
}
}