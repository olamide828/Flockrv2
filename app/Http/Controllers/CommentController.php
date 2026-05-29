<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentController extends Controller
{
    /**
     * GET /api/videos/{video}/comments
     *
     * FIX: Route uses {video} which binds by primary key (id integer).
     * The ULID issue was causing 404 because routes were trying to find
     * by ulid column. We explicitly bind by id here.
     */
    public function index(Video $video): JsonResponse
    {
        $comments = $video->comments()
            ->with(['user:id,name,username,avatar', 'replies.user:id,name,username,avatar'])
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->paginate(30);

        // Append avatar_url accessor to each user
        $comments->getCollection()->transform(function ($comment) {
            $comment->user?->append([]);
            if ($comment->user) {
                $comment->user->avatar_url = $comment->user->avatar_url;
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

        $video->increment('comments_count');

        $comment->load('user:id,name,username,avatar');

        // Manually append avatar_url
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