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
    use \App\Http\Controllers\Concerns\HidesBlockedUsers;

    // ── Shared serialiser ─────────────────────────────────────────────────────
    private function serialise(Comment $comment, array $likedIds = []): array
    {
        $comment->loadMissing('user:id,name,username,avatar');

        $data                       = $comment->toArray();
        $data['replies']            = $data['replies'] ?? [];
        $data['reply_to_username']  = $comment->reply_to_username;
        $data['likes_count']        = $comment->likes_count ?? 0;
        $data['is_pinned']          = (bool) $comment->is_pinned;
        $data['image_url']          = $comment->image_url;
        $data['image_urls']         = $comment->image_urls;
        $data['liked_by_creator']   = (bool) $comment->liked_by_creator;
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
                    $arr['image_url']         = $reply->image_url;
                    $arr['image_urls']        = $reply->image_urls;
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
            ->whereHas('user', fn($u) => $u->where('is_active', true))      // deleted / banned authors vanish
            ->with([
                'user:id,name,username,avatar',
                'replies' => fn($r) => $r->whereHas('user', fn($u) => $u->where('is_active', true)),
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

        $owner = $video->user;

        return response()->json([
            'video_owner'  => $owner ? ['id' => $owner->id, 'name' => $owner->name, 'username' => $owner->username, 'avatar_url' => $owner->avatar_url] : null,
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
            'body'              => 'nullable|string|max:500',
            'image'             => 'nullable|image|mimes:jpg,jpeg,png,webp,gif|max:5120',
            'images'            => 'nullable|array|max:4',
            'images.*'          => 'image|mimes:jpg,jpeg,png,webp,gif|max:5120',
            'parent_id'         => 'nullable|integer|exists:comments,id',
            'reply_to_username' => 'nullable|string|max:50',
        ]);

        $body = trim((string) ($validated['body'] ?? ''));
        $files = $request->hasFile('images') ? array_values((array) $request->file('images')) : ($request->hasFile('image') ? [$request->file('image')] : []);
        $files = array_slice($files, 0, 4);
        if ($body === '' && empty($files)) {
            return response()->json(['message' => 'Write something or add a picture.'], 422);
        }

        // Nobody can comment across a block, or on a banned/deleted creator's video
        if ($this->isBlockedWith($video->user_id) || $this->accountUnavailable($video->user)) {
            return response()->json(['message' => 'You cannot comment on this video.'], 403);
        }

        // Validate parent is a root comment on this video
        if (!empty($validated['parent_id'])) {
            $parent = Comment::where('id', $validated['parent_id'])
                ->where('video_id', $video->id)
                ->whereNull('parent_id')
                ->first();

            if (!$parent) {
                return response()->json(['message' => 'Invalid parent comment.'], 422);
            }
            if ($this->isBlockedWith($parent->user_id)) {
                return response()->json(['message' => 'You cannot reply to this comment.'], 403);
            }
        }

        $paths = [];
        foreach ($files as $f) {
            $paths[] = app(\App\Services\StorageService::class)->uploadCommunityMedia($f, 'image');
        }
        $imagePath = $paths[0] ?? null;

        $comment = Comment::create([
            'user_id'           => Auth::id(),
            'video_id'          => $video->id,
            'body'              => $body,
            'image_path'        => $imagePath,
            'images'            => count($paths) > 1 ? $paths : null,
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

        // @mentions in the comment: tagged people get a notification (not the video owner or parent author, who already got one)
        if ($body !== '') {
            try {
                app(\App\Services\MentionService::class)->notify(
                    $body, Auth::user(), 'comment',
                    "/@{$video->user->username}/video/{$video->ulid}",
                    array_filter([$video->user_id, isset($parent) ? $parent->user_id : null])
                );
            } catch (\Throwable) {}
        }

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

        $isCreator = $comment->video && (int) $comment->video->user_id === (int) $userId;

        if ($liked) {
            \DB::table('comment_likes')
                ->where('comment_id', $comment->id)
                ->where('user_id', $userId)
                ->delete();
            $comment->decrement('likes_count');
            if ($isCreator) $comment->forceFill(['liked_by_creator' => false])->save();
        } else {
            \DB::table('comment_likes')->insertOrIgnore([
                'comment_id' => $comment->id,
                'user_id'    => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $comment->increment('likes_count');
            if ($isCreator) $comment->forceFill(['liked_by_creator' => true])->save();
        }

        return response()->json([
            'liked'       => !$liked,
            'liked_by_creator' => (bool) $comment->fresh()->liked_by_creator,
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
     * DELETE /api/comments/{comment}  (author, video owner, or admin)
     */
    public function destroy(Comment $comment): JsonResponse
    {
        $user    = Auth::user();
        $isOwner = $comment->video && (int) $comment->video->user_id === (int) $user->id;
        abort_unless(
            (int) $user->id === (int) $comment->user_id || $isOwner || $user->isAdmin(),
            403
        );

        \DB::transaction(function () use ($comment) {
            $replyIds   = $comment->replies()->pluck('id');
            $removed    = 1 + $replyIds->count();
            $allIds     = $replyIds->push($comment->id);

            \DB::table('comment_likes')->whereIn('comment_id', $allIds)->delete();
            Comment::whereIn('id', $replyIds)->delete();
            $comment->delete();

            if ($comment->video) {
                \DB::table('videos')->where('id', $comment->video_id)
                    ->update(['comments_count' => \DB::raw("GREATEST(comments_count - {$removed}, 0)")]);
            }
        });

        return response()->json(['message' => 'Comment deleted.']);
    }

    /**
     * POST /api/comments/{comment}/report  { reason, description? }
     * Lands in the admin Reports page as a "Comment" report with the comment shown.
     */
    public function report(Request $request, Comment $comment): JsonResponse
    {
        $data = $request->validate([
            'reason'      => 'required|string|in:Spam,Harassment or bullying,Hate speech,Nudity or sexual content,Violence or threats,Scam or fraud,Misinformation,Something else',
            'description' => 'nullable|string|max:500',
        ]);

        if ((int) $comment->user_id === (int) Auth::id()) {
            return response()->json(['message' => "You can't report your own comment."], 422);
        }

        $prefix = "[Comment: {$comment->id}]";
        $already = \App\Models\Report::where('reporter_id', Auth::id())->where('reason', 'like', $prefix . '%')->exists();
        if ($already) {
            return response()->json(['message' => 'You already reported this comment. Our team will review it.']);
        }

        \App\Models\Report::upsertReport(
            reporterId: Auth::id(),
            reportedId: $comment->user_id,
            reason:     "{$prefix} {$data['reason']}" . (!empty($data['description']) ? ": {$data['description']}" : ''),
            context:    []
        );

        return response()->json(['message' => 'Report sent. Thank you, our team will review it.']);
    }
}
