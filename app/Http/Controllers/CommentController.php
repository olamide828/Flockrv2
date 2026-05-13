<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentController extends Controller
{
    public function index(Video $video): JsonResponse
    {
        $comments = $video->comments()
            ->with([
                'user:id,name,username,avatar',
                'replies.user:id,name,username,avatar',
            ])
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->paginate(30);

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

        return response()->json(
            $comment->load('user:id,name,username,avatar'),
            201
        );
    }

    public function destroy(Comment $comment): JsonResponse
    {
        $this->authorize('delete', $comment);
        $comment->video->decrement('comments_count');
        $comment->delete();
        return response()->json(['message' => 'Comment deleted.']);
    }
}
