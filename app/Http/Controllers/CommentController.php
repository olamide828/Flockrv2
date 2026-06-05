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
    /**
     * GET /api/videos/{video}/comments
     * Filters out comments from users blocked by the current user,
     * and users who have blocked the current user.
     */
    public function index(Video $video): JsonResponse
    {
        // Get IDs of users involved in a block relationship with current user
        $blockedIds = collect();
        if (Auth::check()) {
            $userId = Auth::id();
            // Users I blocked
            $iBlocked = UserBlock::where('blocker_id', $userId)->pluck('blocked_id');
            // Users who blocked me
            $blockedMe = UserBlock::where('blocked_id', $userId)->pluck('blocker_id');
            $blockedIds = $iBlocked->merge($blockedMe)->unique();
        }

        $query = $video->comments()
            ->with(['user:id,name,username,avatar', 'replies.user:id,name,username,avatar'])
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at');

        // Exclude top-level comments from blocked users
        if ($blockedIds->isNotEmpty()) {
            $query->whereNotIn('user_id', $blockedIds);
        }

        $comments = $query->paginate(30);

        // Also filter replies from blocked users
        $comments->getCollection()->transform(function ($comment) use ($blockedIds) {
            if ($comment->user) {
                $comment->user->avatar_url = $comment->user->avatar_url;
            }
            if ($blockedIds->isNotEmpty() && $comment->relationLoaded('replies')) {
                $comment->setRelation(
                    'replies',
                    $comment->replies->filter(fn($r) => !$blockedIds->contains($r->user_id))->values()
                );
            }
            return $comment;
        });

        return response()->json($comments);
    }

    public function store(Request $request, Video $video): JsonResponse
    {
        $validated = $request->validate([
            'body'      => 'required|string|max:500',
            'parent_id' => 'nullable|integer|exists:comments,id',
        ]);

        $comment = $video->allComments()->create([
            'user_id'   => Auth::id(),
            'body'      => $validated['body'],
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        if ($video->user_id !== Auth::id()) {
            try {
                $video->user->notify(new \App\Notifications\NewCommentNotification(Auth::user(), $comment));
            } catch (\Throwable) {}
        }

        $video->increment('comments_count');

        $comment->load('user:id,name,username,avatar');

        $data = $comment->toArray();
        $data['user']['avatar_url'] = $comment->user?->avatar_url;

        return response()->json($data, 201);
    }

    public function destroy(Comment $comment): JsonResponse
    {
        abort_unless(
            Auth::id() === $comment->user_id || Auth::user()->isAdmin(),
            403
        );

        $comment->video?->decrement('comments_count');
        $comment->delete();

        return response()->json(['message' => 'Comment deleted.']);
    }
}