<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\UserBlock;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentController extends Controller
{
    // ── Shared serialiser ─────────────────────────────────────────────────────
    private function serialise(Comment $comment, array $likedIds = []): array
    {
        $comment->loadMissing('user:id,name,username,avatar');

        $data                       = $comment->toArray();
        $data['replies']            = $data['replies'] ?? [];
        $data['reply_to_username']  = $comment->reply_to_username;
        $data['likes_count']        = $comment->likes_count ?? 0;
        $data['is_pinned']          = (bool) $comment->is_pinned;
        $data['is_liked_by_me']     = in_array($comment->id, $likedIds);

        if ($comment->user) {
            $data['user']['avatar_url'] = $comment->user->avatar_url;
        }

        // Serialise nested replies with same liked state
        if (!empty($data['replies'])) {
            $data['replies'] = collect($data['replies'])->map(function ($reply) use ($likedIds) {
                if ($reply instanceof Comment) {
                    if ($reply->user) $reply->user->avatar_url = $reply->user->avatar_url;
                    $arr = $reply->toArray();
                    $arr['is_liked_by_me']    = in_array($reply->id, $likedIds);
                    $arr['reply_to_username'] = $reply->reply_to_username;
                    if ($reply->user) $arr['user']['avatar_url'] = $reply->user->avatar_url;
                    return $arr;
                }
                // Already an array (from toArray())
                $reply['is_liked_by_me'] = in_array($reply['id'] ?? 0, $likedIds);
                return $reply;
            })->values()->toArray();
        }

        return $data;
    }

    /**
     * GET /api/videos/{video}/comments
     */
    public function index(Video $video): JsonResponse
    {
        $userId     = Auth::id();
        $blockedIds = collect();

        if ($userId) {
            $iBlocked   = UserBlock::where('blocker_id', $userId)->pluck('blocked_id');
            $blockedMe  = UserBlock::where('blocked_id', $userId)->pluck('blocker_id');
            $blockedIds = $iBlocked->merge($blockedMe)->unique();
        }

        $comments = $video->comments()
            ->whereNull('parent_id')
            ->with([
                'user:id,name,username,avatar',
                'replies.user:id,name,username,avatar',
            ])
            ->when($blockedIds->isNotEmpty(), fn($q) => $q->whereNotIn('user_id', $blockedIds))
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->paginate(30);

        // Get all comment IDs (top-level + replies) so we can check likes in one query
        $allCommentIds = $comments->getCollection()->flatMap(function ($c) {
            return collect([$c->id])->merge($c->replies->pluck('id'));
        })->unique()->values()->all();

        // One query to get all IDs liked by current user
        $likedIds = $userId && !empty($allCommentIds)
            ? \DB::table('comment_likes')
                ->where('user_id', $userId)
                ->whereIn('comment_id', $allCommentIds)
                ->pluck('comment_id')
                ->toArray()
            : [];

        // Transform
        $comments->getCollection()->transform(function ($comment) use ($blockedIds, $likedIds) {
            // Filter blocked users from replies
            if ($blockedIds->isNotEmpty() && $comment->relationLoaded('replies')) {
                $comment->setRelation(
                    'replies',
                    $comment->replies->filter(fn($r) => !$blockedIds->contains($r->user_id))->values()
                );
            }
            // Ensure avatar on replies
            if ($comment->relationLoaded('replies')) {
                $comment->replies->each(function ($reply) {
                    if ($reply->user) $reply->user->avatar_url = $reply->user->avatar_url;
                });
            }
            return $comment;
        });

        // Serialise with liked state
        $serialised = $comments->getCollection()->map(
            fn($c) => $this->serialise($c, $likedIds)
        );

        return response()->json([
            'data'         => $serialised,
            'current_page' => $comments->currentPage(),
            'last_page'    => $comments->lastPage(),
            'total'        => $comments->total(),
        ]);
    }

    /**
     * POST /api/videos/{video}/comments
     */
    public function store(Request $request, Video $video): JsonResponse
    {
        $validated = $request->validate([
            'body'              => 'required|string|max:500',
            'parent_id'         => 'nullable|integer|exists:comments,id',
            'reply_to_username' => 'nullable|string|max:50',
        ]);

        // Validate parent is a root comment on this video
        if (!empty($validated['parent_id'])) {
            $parent = Comment::where('id', $validated['parent_id'])
                ->where('video_id', $video->id)
                ->whereNull('parent_id')
                ->first();

            if (!$parent) {
                return response()->json(['message' => 'Invalid parent comment.'], 422);
            }
        }

        $comment = Comment::create([
            'user_id'           => Auth::id(),
            'video_id'          => $video->id,
            'body'              => $validated['body'],
            'parent_id'         => $validated['parent_id'] ?? null,
            'reply_to_username' => $validated['reply_to_username'] ?? null,
            'likes_count'       => 0,
            'is_pinned'         => false,
        ]);

        // Notify video owner
        if ($video->user_id !== Auth::id()) {
            try { $video->user->notify(new \App\Notifications\NewCommentNotification(Auth::user(), $comment)); } catch (\Throwable) {}
        }

        // Notify parent comment author
        if (!empty($validated['parent_id'])) {
            $parent = $parent ?? Comment::find($validated['parent_id']);
            if ($parent && $parent->user_id !== Auth::id() && $parent->user_id !== $video->user_id) {
                try { $parent->user->notify(new \App\Notifications\NewCommentNotification(Auth::user(), $comment)); } catch (\Throwable) {}
            }
        }

        $video->increment('comments_count');
        $comment->load('user:id,name,username,avatar');

        // New comment is never liked by its author on creation
        return response()->json($this->serialise($comment, []), 201);
    }

    /**
     * POST /api/comments/{comment}/like
     */
    public function like(Comment $comment): JsonResponse
    {
        $userId = Auth::id();

        $liked = \DB::table('comment_likes')
            ->where('comment_id', $comment->id)
            ->where('user_id', $userId)
            ->exists();

        if ($liked) {
            \DB::table('comment_likes')
                ->where('comment_id', $comment->id)
                ->where('user_id', $userId)
                ->delete();
            $comment->decrement('likes_count');
        } else {
            \DB::table('comment_likes')->insertOrIgnore([
                'comment_id' => $comment->id,
                'user_id'    => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $comment->increment('likes_count');
        }

        return response()->json([
            'liked'       => !$liked,
            'likes_count' => max(0, $comment->fresh()->likes_count),
        ]);
    }

    /**
     * POST /api/comments/{comment}/pin
     */
    public function pin(Comment $comment): JsonResponse
    {
        $video = $comment->video;
        abort_unless($video && $video->user_id === Auth::id(), 403);

        // Unpin all others first
        Comment::where('video_id', $video->id)
            ->where('id', '!=', $comment->id)
            ->where('is_pinned', true)
            ->update(['is_pinned' => false]);

        $comment->update(['is_pinned' => !$comment->is_pinned]);

        return response()->json([
            'pinned'  => $comment->is_pinned,
            'message' => $comment->is_pinned ? 'Comment pinned.' : 'Comment unpinned.',
        ]);
    }

    /**
     * DELETE /api/comments/{comment}
     */
    public function destroy(Comment $comment): JsonResponse
    {
        abort_unless(
            Auth::id() === $comment->user_id || Auth::user()->isAdmin(),
            403
        );

        $replyCount = $comment->replies()->count();
        $comment->video?->decrement('comments_count', 1 + $replyCount);
        $comment->delete();

        return response()->json(['message' => 'Comment deleted.']);
    }
}