<?php

namespace App\Http\Controllers;

use App\Events\RoomMessageDeleted;
use App\Events\RoomMessageSent;
use App\Models\Post;
use App\Models\PostComment;
use App\Models\PostMedia;
use App\Models\Room;
use App\Models\RoomMessage;
use App\Models\User;
use App\Services\CommunityFeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CommunityController extends Controller
{
    public function __construct(private CommunityFeedService $feedService)
    {
    }

    // ── Page ─────────────────────────────────────────────────────────────────

    public function index(): Response
    {
        $user        = Auth::user();
        $joinedRooms = $user ? $this->getJoinedRooms($user) : collect();

        $discoverRooms = Room::where('is_private', false)
            ->with('seller:id,name,username,avatar,is_verified')
            ->when($joinedRooms->isNotEmpty(),
                fn($q) => $q->whereNotIn('id', $joinedRooms->pluck('id'))
            )
            ->orderByDesc('members_count')
            ->limit(20)
            ->get()
            ->map(fn($r) => $this->serialiseRoom($r));

        return Inertia::render('Community/Index', [
            'joinedRooms'   => $joinedRooms,
            'discoverRooms' => $discoverRooms,
        ]);
    }

    // ── General Feed ──────────────────────────────────────────────────────────

    public function feed(Request $request): JsonResponse
    {
        $userId    = Auth::id();
        $sessionId = $userId ? null : $this->guestSessionId($request);
        $page      = (int) $request->get('page', 1);

        $result = $this->feedService->getFeed($userId, $sessionId, $page, 20);
        $posts  = collect($result['data']);

        $likedIds = [];
        if ($userId && $posts->isNotEmpty()) {
            $likedIds = DB::table('post_likes')
                ->where('user_id', $userId)
                ->whereIn('post_id', $posts->pluck('id'))
                ->pluck('post_id')
                ->all();
        }

        $followingIds = $userId
            ? DB::table('follows')->where('follower_id', $userId)->pluck('following_id')->all()
            : [];

        $data = $posts->map(function ($p) use ($likedIds, $followingIds) {
            $arr                   = $p->toArray();
            $arr['is_liked_by_me'] = in_array($p->id, $likedIds);
            $arr['is_following_author'] = in_array($p->user_id, $followingIds);
            $arr['comments_count'] = PostComment::where('post_id', $p->id)->whereNull('parent_id')->count();
            if ($p->user) $arr['user']['avatar_url'] = $p->user->avatar_url;
            return $arr;
        });

        return response()->json([
            'data'         => $data,
            'current_page' => $result['current_page'],
            'last_page'    => $result['last_page'],
        ]);
    }

    /**
     * GET /api/community/users/{user}/posts — powers the "Posts" tab on the
     * user profile page. Straight reverse-chronological, no algorithmic
     * ranking (this is someone's own timeline, not a discovery feed).
     */
    public function userPosts(Request $request, User $user): JsonResponse
    {
        $viewerId = Auth::id();
        $page = (int) $request->get('page', 1);

        $blockedIds = $viewerId ? $this->blockedIdsFor($viewerId) : [];
        if (in_array($user->id, $blockedIds)) {
            return response()->json(['data' => [], 'current_page' => 1, 'last_page' => 1]);
        }

        $paginated = Post::whereNull('room_id')
            ->where('user_id', $user->id)
            ->with(['user:id,name,username,avatar,is_verified,role', 'media'])
            ->latest()
            ->paginate(20, ['*'], 'page', $page);

        $posts = collect($paginated->items());

        $likedIds = [];
        if ($viewerId && $posts->isNotEmpty()) {
            $likedIds = DB::table('post_likes')
                ->where('user_id', $viewerId)
                ->whereIn('post_id', $posts->pluck('id'))
                ->pluck('post_id')->all();
        }

        $isFollowing = $viewerId && DB::table('follows')
            ->where('follower_id', $viewerId)->where('following_id', $user->id)->exists();

        $data = $posts->map(function ($p) use ($likedIds, $isFollowing) {
            $arr = $p->toArray();
            $arr['is_liked_by_me'] = in_array($p->id, $likedIds);
            $arr['is_following_author'] = $isFollowing;
            $arr['comments_count'] = PostComment::where('post_id', $p->id)->whereNull('parent_id')->count();
            if ($p->user) $arr['user']['avatar_url'] = $p->user->avatar_url;
            return $arr;
        });

        return response()->json([
            'data'         => $data,
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
        ]);
    }

    private function blockedIdsFor(int $userId): array
    {
        $iBlocked  = \App\Models\UserBlock::where('blocker_id', $userId)->pluck('blocked_id');
        $blockedMe = \App\Models\UserBlock::where('blocked_id', $userId)->pluck('blocker_id');
        return $iBlocked->concat($blockedMe)->unique()->toArray();
    }

    public function showPost(Post $post): JsonResponse
    {
        $userId = Auth::id();
        $post->load(['user:id,name,username,avatar,is_verified', 'media']);

        $liked = $userId && DB::table('post_likes')
            ->where('post_id', $post->id)->where('user_id', $userId)->exists();

        $following = $userId && DB::table('follows')
            ->where('follower_id', $userId)->where('following_id', $post->user_id)->exists();

        $comments = $this->serialisedComments($post, $userId);

        return response()->json([
            'post'     => array_merge($post->toArray(), [
                'is_liked_by_me'      => $liked,
                'is_following_author' => $following,
                'comments_count'      => $this->countComments($post),
                'user'                => array_merge($post->user->toArray(), ['avatar_url' => $post->user->avatar_url]),
            ]),
            'comments' => $comments,
        ]);
    }

    public function showPostPage(Post $post): Response
    {
        $userId = Auth::id();
        $post->load(['user:id,name,username,avatar,is_verified', 'media']);

        $liked = $userId && DB::table('post_likes')
            ->where('post_id', $post->id)->where('user_id', $userId)->exists();

        $following = $userId && DB::table('follows')
            ->where('follower_id', $userId)->where('following_id', $post->user_id)->exists();

        $comments = $this->serialisedComments($post, $userId);

        return Inertia::render('Community/CommunityPost', [
            'post'     => array_merge($post->toArray(), [
                'is_liked_by_me'      => $liked,
                'is_following_author' => $following,
                'comments_count'      => $this->countComments($post),
                'user'                => array_merge($post->user->toArray(), ['avatar_url' => $post->user->avatar_url]),
            ]),
            'comments' => $comments,
        ]);
    }

    // ── Post Views ───────────────────────────────────────────────────────────

    public function recordPostView(Request $request, Post $post): JsonResponse
    {
        $userId    = Auth::id();
        $sessionId = $userId ? null : ($request->cookie('flockr_sid') ?? $request->header('X-Session-ID'));
        $viewerKey = $userId ? "u:{$userId}" : ($sessionId ? "s:{$sessionId}" : null);

        if ($viewerKey) {
            $inserted = DB::table('post_views')->insertOrIgnore([
                'post_id'    => $post->id,
                'user_id'    => $userId,
                'session_id' => $sessionId,
                'viewer_key' => $viewerKey,
                'viewed_at'  => now(),
            ]);

            if ($inserted) {
                $post->increment('views_count');
            }
        } else {
            // No auth and no session cookie at all — can't dedupe this
            // visitor, so count the view but don't write a row we can't
            // attribute to anyone.
            $post->increment('views_count');
        }

        return response()->json(['views_count' => $post->fresh()->views_count]);
    }

    /**
     * Owner-only viewer list — like Instagram Stories' viewer sheet.
     * Only shows identified (logged-in) viewers; anonymous session-only
     * views count toward views_count but can't be attributed to a person.
     */
    public function postViewers(Post $post): JsonResponse
    {
        abort_unless(Auth::id() === $post->user_id, 403);

        $viewers = DB::table('post_views')
            ->join('users', 'users.id', '=', 'post_views.user_id')
            ->where('post_views.post_id', $post->id)
            ->whereNotNull('post_views.user_id')
            ->select('users.id', 'users.name', 'users.username', 'users.avatar', 'users.is_verified', 'post_views.viewed_at')
            ->orderByDesc('post_views.viewed_at')
            ->limit(200)
            ->get()
            ->map(function ($u) {
                $user = User::find($u->id);
                return array_merge((array) $u, ['avatar_url' => $user?->avatar_url]);
            });

        return response()->json($viewers);
    }

    // ── Post Comments ─────────────────────────────────────────────────────────

    public function postComments(Post $post): JsonResponse
    {
        return response()->json($this->serialisedComments($post, Auth::id()));
    }

    public function storePostComment(Request $request, Post $post): JsonResponse
    {
        $validated = $request->validate([
            'body'              => 'required|string|max:500',
            'parent_id'         => 'nullable|integer|exists:post_comments,id',
            'reply_to_username' => 'nullable|string|max:60',
        ]);

        $comment = PostComment::create([
            'post_id'           => $post->id,
            'user_id'           => Auth::id(),
            'parent_id'         => $validated['parent_id'] ?? null,
            'reply_to_username' => $validated['reply_to_username'] ?? null,
            'body'              => $validated['body'],
        ]);

        $post->increment('comments_count');

        $comment->load('user:id,name,username,avatar');

        return response()->json(array_merge($comment->toArray(), [
            'user'           => array_merge($comment->user->toArray(), ['avatar_url' => $comment->user->avatar_url]),
            'replies'        => [],
            'is_liked_by_me' => false,
        ]), 201);
    }

    public function destroyPostComment(PostComment $comment): JsonResponse
    {
        abort_unless(Auth::id() === $comment->user_id || Auth::user()->isAdmin(), 403);

        $post = $comment->post;
        $comment->delete();
        if ($post) $post->decrement('comments_count');

        return response()->json(['message' => 'Deleted.']);
    }

    public function likePostComment(PostComment $comment): JsonResponse
    {
        $userId = Auth::id();
        $liked  = DB::table('post_comment_likes')
            ->where('post_comment_id', $comment->id)->where('user_id', $userId)->exists();

        if ($liked) {
            DB::table('post_comment_likes')->where('post_comment_id', $comment->id)->where('user_id', $userId)->delete();
            $comment->decrement('likes_count');
        } else {
            DB::table('post_comment_likes')->insertOrIgnore([
                'post_comment_id' => $comment->id, 'user_id' => $userId,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $comment->increment('likes_count');
        }

        return response()->json([
            'liked'       => !$liked,
            'likes_count' => max(0, $comment->fresh()->likes_count),
        ]);
    }

    public function pinPostComment(PostComment $comment): JsonResponse
    {
        $comment->load('post');
        abort_unless(Auth::id() === $comment->post->user_id, 403);
        abort_if($comment->parent_id !== null, 422, 'Only top-level comments can be pinned.');

        // Only one pinned comment per post — unpin any existing one first.
        if (!$comment->is_pinned) {
            PostComment::where('post_id', $comment->post_id)->where('is_pinned', true)->update(['is_pinned' => false]);
        }
        $comment->update(['is_pinned' => !$comment->is_pinned]);

        return response()->json(['is_pinned' => $comment->is_pinned]);
    }

    // ── Posts ─────────────────────────────────────────────────────────────────

    public function storePost(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content'           => 'nullable|string|max:2000',
            // Legacy single-media fields — still accepted so nothing that
            // calls this endpoint the old way breaks.
            'media_url'         => 'nullable|string|max:1000',
            'media_type'        => 'nullable|in:image,video',
            // New multi-media field — array of {url, type}.
            'media'             => 'nullable|array|max:10',
            'media.*.url'       => 'required_with:media|string|max:1000',
            'media.*.type'      => 'required_with:media|in:image,video',
        ]);

        $mediaItems = $validated['media'] ?? (
            !empty($validated['media_url'])
                ? [['url' => $validated['media_url'], 'type' => $validated['media_type'] ?? 'image']]
                : []
        );

        if (empty($validated['content']) && empty($mediaItems)) {
            return response()->json(['message' => 'Post must have content or media.'], 422);
        }

        $post = Post::create([
            'user_id'    => Auth::id(),
            'room_id'    => null,
            'content'    => $validated['content'] ?? null,
            // Kept in sync with the first media item for any older code
            // (or DB queries) that still reads the single-media columns.
            'media_url'  => $mediaItems[0]['url'] ?? null,
            'media_type' => $mediaItems[0]['type'] ?? null,
        ]);

        foreach ($mediaItems as $i => $item) {
            PostMedia::create([
                'post_id'    => $post->id,
                'media_url'  => $item['url'],
                'media_type' => $item['type'],
                'position'   => $i,
            ]);
        }

        $post->load(['user:id,name,username,avatar,is_verified', 'media']);

        return response()->json(array_merge($post->toArray(), [
            'is_liked_by_me' => false,
            'comments_count' => 0,
            'user'           => array_merge($post->user->toArray(), ['avatar_url' => $post->user->avatar_url]),
        ]), 201);
    }

    public function likePost(Post $post): JsonResponse
    {
        $userId = Auth::id();
        $liked  = DB::table('post_likes')
            ->where('post_id', $post->id)->where('user_id', $userId)->exists();

        if ($liked) {
            DB::table('post_likes')->where('post_id', $post->id)->where('user_id', $userId)->delete();
            $post->decrement('likes_count');
        } else {
            DB::table('post_likes')->insertOrIgnore([
                'post_id' => $post->id, 'user_id' => $userId,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $post->increment('likes_count');
        }

        return response()->json([
            'liked'       => !$liked,
            'likes_count' => max(0, $post->fresh()->likes_count),
        ]);
    }

    public function dismissPost(Post $post): JsonResponse
    {
        DB::table('post_dismissals')->insertOrIgnore([
            'post_id'    => $post->id,
            'user_id'    => Auth::id(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => "Got it, we'll show you less like this."]);
    }

    public function destroyPost(Post $post): JsonResponse
    {
        abort_unless(Auth::id() === $post->user_id || Auth::user()->isAdmin(), 403);
        $post->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // ── Room Messages ─────────────────────────────────────────────────────────

    public function roomMessages(Request $request, Room $room): JsonResponse
    {
        $this->assertMember($room);

        // If this user has EVER left/been-kicked from this room before
        // (i.e. this is a rejoin, not their first time), hide messages sent
        // before their current membership started — otherwise rejoining
        // would replay the entire history they weren't supposed to see
        // while they were out. First-time joiners are unaffected and see
        // the room's full history as normal.
        $hasPriorExit = DB::table('room_exit_log')
            ->where('room_id', $room->id)->where('user_id', Auth::id())->exists();

        $myMembership = $hasPriorExit
            ? DB::table('room_user')->where('room_id', $room->id)->where('user_id', Auth::id())->first()
            : null;

        $messages = RoomMessage::where('room_id', $room->id)
            ->with([
                'user:id,name,username,avatar,is_verified',
                'replyTo:id,user_id,body,media_url',
                'replyTo.user:id,name,username',
            ])
            ->when($myMembership, fn($q) => $q->where('created_at', '>=', $myMembership->created_at))
            ->when($request->before_id, fn($q) => $q->where('id', '<', $request->before_id))
            ->latest()
            ->limit(40)
            ->get()
            ->reverse()
            ->values();

        DB::table('room_user')
            ->where('room_id', $room->id)->where('user_id', Auth::id())
            ->update(['last_read_at' => now()]);

        return response()->json([
            'messages' => $messages->map(fn($m) => $this->serialiseMessage($m)),
            'has_more' => RoomMessage::where('room_id', $room->id)
                ->when($myMembership, fn($q) => $q->where('created_at', '>=', $myMembership->created_at))
                ->when($messages->first(), fn($q) => $q->where('id', '<', $messages->first()['id']))
                ->exists(),
        ]);
    }

    public function sendRoomMessage(Request $request, Room $room): JsonResponse
    {
        $this->assertMember($room);

        $validated = $request->validate([
            'body'        => 'nullable|string|max:2000',
            'media_url'   => 'nullable|string|max:1000',
            'media_type'  => 'nullable|in:image,video',
            'reply_to_id' => 'nullable|integer|exists:room_messages,id',
        ]);

        if (empty($validated['body']) && empty($validated['media_url'])) {
            return response()->json(['message' => 'Message cannot be empty.'], 422);
        }

        $msg = RoomMessage::create([
            'room_id'     => $room->id,
            'user_id'     => Auth::id(),
            'body'        => $validated['body'] ?? null,
            'media_url'   => $validated['media_url'] ?? null,
            'media_type'  => $validated['media_type'] ?? null,
            'reply_to_id' => $validated['reply_to_id'] ?? null,
        ]);

        $msg->loadMissing([
            'user:id,name,username,avatar,is_verified',
            'replyTo:id,user_id,body',
            'replyTo.user:id,name,username',
        ]);

        $room->touch();

        DB::table('room_user')
            ->where('room_id', $room->id)->where('user_id', Auth::id())
            ->update(['last_read_at' => now()]);

        try { broadcast(new RoomMessageSent($msg))->toOthers(); } catch (\Throwable) {}

        return response()->json($this->serialiseMessage($msg), 201);
    }

    /**
     * Soft-marks the message as deleted instead of removing the row, so every
     * client (including ones that already loaded it) can render a
     * "This message was deleted" placeholder instead of it just vanishing.
     */
    public function deleteRoomMessage(Room $room, RoomMessage $message): JsonResponse
    {
        abort_unless(
            Auth::id() === $message->user_id
            || Auth::id() === $room->seller_id
            || Auth::user()->isAdmin(),
            403
        );

        $message->update([
            'is_deleted' => true,
            'body'       => null,
            'media_url'  => null,
            'media_type' => null,
        ]);

        try { broadcast(new RoomMessageDeleted($room->id, $message->id))->toOthers(); } catch (\Throwable) {}

        return response()->json(['message' => 'Deleted.']);
    }

    // ── Rooms ─────────────────────────────────────────────────────────────────

    public function storeRoom(Request $request): JsonResponse
    {
        abort_unless(in_array(Auth::user()->role, ['seller', 'admin']), 403);

        $validated = $request->validate([
            'name'        => 'required|string|max:80',
            'description' => 'nullable|string|max:500',
            'rules'       => 'nullable|array',
            'rules.*'     => 'string|max:200',
            'is_private'  => 'boolean',
        ]);

        $room = Room::create([
            'seller_id'   => Auth::id(),
            'name'        => $validated['name'],
            'description' => $validated['description'] ?? null,
            'rules'       => $validated['rules'] ?? [],
            'is_private'  => $validated['is_private'] ?? false,
            'invite_code' => strtoupper(Str::random(8)),
        ]);

        $room->members()->attach(Auth::id(), ['role' => 'moderator', 'last_read_at' => now()]);
        $room->increment('members_count');
        $room->load('seller:id,name,username,avatar,is_verified');

        return response()->json(array_merge(
            $this->serialiseRoom($room),
            ['has_unread' => false, 'pivot_role' => 'moderator']
        ), 201);
    }

    public function updateRoom(Request $request, Room $room): JsonResponse
    {
        abort_unless(Auth::id() === $room->seller_id, 403);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:80',
            'description' => 'nullable|string|max:500',
            'is_private'  => 'sometimes|boolean',
            'avatar_url'  => 'nullable|string|max:1000',
        ]);

        if (isset($validated['avatar_url'])) {
            $room->avatar = $validated['avatar_url'];
            unset($validated['avatar_url']);
        }

        $room->update($validated);

        return response()->json(
            $this->serialiseRoom($room->fresh()->load('seller:id,name,username,avatar,is_verified'))
        );
    }

    public function joinRoom(Room $room): JsonResponse
    {
        $userId   = Auth::id();
        $isMember = DB::table('room_user')
            ->where('room_id', $room->id)->where('user_id', $userId)->exists();

        if ($isMember) {
            $leavingUserName = Auth::user()->name;
            DB::table('room_user')->where('room_id', $room->id)->where('user_id', $userId)->delete();
            $room->decrement('members_count');
            DB::table('room_exit_log')->insert([
                'room_id' => $room->id, 'user_id' => $userId, 'reason' => 'left',
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->postSystemMessage($room, $leavingUserName . ' left the room', $userId);
            return response()->json(['joined' => false, 'members_count' => max(0, $room->fresh()->members_count)]);
        }

        [$allowed, $message] = $this->checkCanJoin($room, $userId);
        if (!$allowed) {
            return response()->json(['message' => $message], 403);
        }

        DB::table('room_user')->insert([
            'room_id'      => $room->id,
            'user_id'      => $userId,
            'role'         => 'member',
            'last_read_at' => now(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
        $room->increment('members_count');
        $this->postSystemMessage($room, Auth::user()->name . ' joined the room', $userId);

        return response()->json([
            'joined'        => true,
            'members_count' => $room->fresh()->members_count,
            'room'          => $this->serialiseRoom($room->load('seller:id,name,username,avatar,is_verified')),
        ]);
    }

    /**
     * POST /api/community/rooms/join-by-invite
     *
     * Public rooms: joins immediately.
     * Private rooms: an invite link/code is just how you FOUND the room —
     * it still creates a pending request the seller has to approve. This
     * matches "approval required" behaviour everywhere for private rooms.
     */
    /**
     * GET /api/community/rooms/lookup-invite
     * Preview-only — does NOT join or create a request. Lets the frontend
     * show the same info+rules confirmation modal for an invite code as it
     * does for browsing a room in Discover, instead of joining blind.
     */
    public function lookupInviteCode(Request $request): JsonResponse
    {
        abort_unless(Auth::check(), 401, 'Please log in to join a room.');

        $validated = $request->validate(['invite_code' => 'required|string']);
        $room = Room::where('invite_code', strtoupper($validated['invite_code']))
            ->with('seller:id,name,username,avatar,is_verified')
            ->first();

        if (!$room) {
            return response()->json(['message' => 'Invalid invite code.'], 404);
        }

        $alreadyMember = DB::table('room_user')
            ->where('room_id', $room->id)->where('user_id', Auth::id())->exists();

        return response()->json(array_merge($this->serialiseRoom($room), [
            'already_joined' => $alreadyMember,
        ]));
    }

    public function joinByInvite(Request $request): JsonResponse
    {
        abort_unless(Auth::check(), 401, 'Please log in to join a room.');

        $validated = $request->validate(['invite_code' => 'required|string']);

        $room = Room::where('invite_code', strtoupper($validated['invite_code']))->firstOrFail();

        $userId   = Auth::id();
        $isMember = DB::table('room_user')
            ->where('room_id', $room->id)->where('user_id', $userId)->exists();

        if ($isMember) {
            return response()->json([
                'joined'  => true,
                'message' => 'Already a member.',
                'room'    => $this->serialiseRoom($room->load('seller:id,name,username,avatar,is_verified')),
            ]);
        }

        [$allowed, $banMessage] = $this->checkCanJoin($room, $userId);
        if (!$allowed) {
            return response()->json(['message' => $banMessage], 403);
        }

        if ($room->is_private) {
            DB::table('room_join_requests')->updateOrInsert(
                ['room_id' => $room->id, 'user_id' => $userId],
                ['status' => 'pending', 'updated_at' => now(), 'created_at' => now()]
            );

            return response()->json([
                'joined'   => false,
                'requested' => true,
                'room'     => $this->serialiseRoom($room->load('seller:id,name,username,avatar,is_verified')),
            ]);
        }

        DB::table('room_user')->insert([
            'room_id'      => $room->id,
            'user_id'      => $userId,
            'role'         => 'member',
            'last_read_at' => now(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
        $room->increment('members_count');
        $this->postSystemMessage($room, Auth::user()->name . ' joined the room', $userId);

        return response()->json([
            'joined' => true,
            'room'   => $this->serialiseRoom($room->fresh()->load('seller:id,name,username,avatar,is_verified')),
        ]);
    }

    public function requestJoinRoom(Room $room): JsonResponse
    {
        $userId = Auth::id();

        $alreadyMember = DB::table('room_user')
            ->where('room_id', $room->id)->where('user_id', $userId)->exists();
        if ($alreadyMember) {
            return response()->json(['message' => 'Already a member.'], 422);
        }

        DB::table('room_join_requests')->updateOrInsert(
            ['room_id' => $room->id, 'user_id' => $userId],
            ['status' => 'pending', 'updated_at' => now(), 'created_at' => now()]
        );

        return response()->json(['requested' => true]);
    }

    public function pendingRequests(Room $room): JsonResponse
    {
        abort_unless(Auth::id() === $room->seller_id, 403);

        $requests = DB::table('room_join_requests')
            ->join('users', 'users.id', '=', 'room_join_requests.user_id')
            ->where('room_join_requests.room_id', $room->id)
            ->where('room_join_requests.status', 'pending')
            ->select('room_join_requests.id as request_id', 'users.id', 'users.name', 'users.username', 'users.avatar')
            ->get()
            ->map(function ($u) {
                $user = User::find($u->id);
                return array_merge((array) $u, ['avatar_url' => $user?->avatar_url]);
            });

        return response()->json($requests);
    }

    public function resolveRequest(Request $request, Room $room, int $requestId): JsonResponse
    {
        abort_unless(Auth::id() === $room->seller_id, 403);

        $validated = $request->validate(['action' => 'required|in:approve,reject']);

        $req = DB::table('room_join_requests')
            ->where('id', $requestId)->where('room_id', $room->id)->first();
        abort_if(!$req, 404);

        if ($validated['action'] === 'approve') {
            DB::table('room_user')->insertOrIgnore([
                'room_id'      => $room->id,
                'user_id'      => $req->user_id,
                'role'         => 'member',
                'last_read_at' => now(),
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
            $room->increment('members_count');

            $approvedUser = User::find($req->user_id);
            if ($approvedUser) {
                $this->postSystemMessage($room, $approvedUser->name . ' joined the room', $approvedUser->id);
            }
        }

        DB::table('room_join_requests')->where('id', $requestId)->update([
            'status' => $validated['action'] === 'approve' ? 'approved' : 'rejected',
        ]);

        return response()->json(['message' => 'Done.']);
    }

    public function updateRules(Request $request, Room $room): JsonResponse
    {
        abort_unless(Auth::id() === $room->seller_id, 403);
        $validated = $request->validate(['rules' => 'required|array', 'rules.*' => 'string|max:200']);
        $room->update(['rules' => $validated['rules']]);
        return response()->json(['rules' => $room->rules]);
    }

    public function kickUser(Request $request, Room $room): JsonResponse
    {
        abort_unless(Auth::id() === $room->seller_id, 403);
        $validated = $request->validate(['user_id' => 'required|integer|exists:users,id']);
        if ($validated['user_id'] === Auth::id()) return response()->json(['message' => 'Cannot kick yourself.'], 422);
        DB::table('room_user')->where('room_id', $room->id)->where('user_id', $validated['user_id'])->delete();
        $room->decrement('members_count');
        return response()->json(['message' => 'Member removed.']);
    }

    public function roomMembers(Room $room): JsonResponse
    {
        $members = DB::table('room_user')
            ->join('users', 'users.id', '=', 'room_user.user_id')
            ->where('room_user.room_id', $room->id)
            ->select('users.id', 'users.name', 'users.username', 'users.avatar', 'users.is_verified', 'room_user.role')
            ->orderByRaw("CASE WHEN room_user.role = 'moderator' THEN 0 ELSE 1 END")
            ->get()
            ->map(function ($u) {
                $user = User::find($u->id);
                return array_merge((array) $u, ['avatar_url' => $user?->avatar_url]);
            });

        return response()->json($members);
    }

    public function joinedRooms(): JsonResponse
    {
        $user = Auth::user();
        if (!$user) return response()->json([]);
        return response()->json($this->getJoinedRooms($user));
    }

    public function discoverRooms(Request $request): JsonResponse
    {
        $userId = Auth::id();
        $q      = trim($request->get('q', ''));

        $joined = $userId
            ? DB::table('room_user')->where('user_id', $userId)->pluck('room_id')->toArray()
            : [];

        $rooms = Room::where('is_private', false)
            ->when($q, fn($query) =>
                $query->where(fn($q2) =>
                    $q2->where('name', 'ilike', "%{$q}%")
                       ->orWhere('description', 'ilike', "%{$q}%")
                )
            )
            ->with('seller:id,name,username,avatar,is_verified')
            ->orderByDesc('members_count')
            ->limit(30)
            ->get()
            ->map(fn($r) => array_merge($this->serialiseRoom($r), [
                'already_joined' => in_array($r->id, $joined),
            ]));

        return response()->json($rooms);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function assertMember(Room $room): void
    {
        abort_unless(
            DB::table('room_user')
                ->where('room_id', $room->id)
                ->where('user_id', Auth::id())
                ->exists(),
            403,
            'You are not a member of this room.'
        );
    }

    private function countComments(Post $post): int
    {
        return PostComment::where('post_id', $post->id)->whereNull('parent_id')->count();
    }

    /**
     * Flat-thread pattern: every comment's parent_id points to the ROOT
     * comment, never to another reply. A reply-to-a-reply is tagged via
     * reply_to_username instead of nesting deeper. This matches your video
     * CommentSheet exactly, so one level of eager-loaded replies is always
     * enough — no recursive queries needed.
     */
    private function serialisedComments(Post $post, ?int $userId): \Illuminate\Support\Collection
    {
        $comments = PostComment::where('post_id', $post->id)
            ->whereNull('parent_id')
            ->with(['user:id,name,username,avatar', 'replies.user:id,name,username,avatar'])
            ->orderByDesc('is_pinned')
            ->latest()
            ->get();

        $allIds = $comments->pluck('id')
            ->concat($comments->flatMap(fn($c) => $c->replies->pluck('id')))
            ->all();

        $likedIds = $userId
            ? DB::table('post_comment_likes')->where('user_id', $userId)->whereIn('post_comment_id', $allIds)->pluck('post_comment_id')->all()
            : [];

        return $comments->map(function ($c) use ($likedIds) {
            $arr = $c->toArray();
            if ($c->user) $arr['user']['avatar_url'] = $c->user->avatar_url;
            $arr['is_liked_by_me'] = in_array($c->id, $likedIds);
            $arr['replies'] = $c->replies->map(function ($r) use ($likedIds) {
                $rArr = $r->toArray();
                if ($r->user) $rArr['user']['avatar_url'] = $r->user->avatar_url;
                $rArr['is_liked_by_me'] = in_array($r->id, $likedIds);
                return $rArr;
            })->values()->all();
            return $arr;
        })->values();
    }

    private function guestSessionId(Request $request): ?string
    {
        return $request->cookie('flockr_sid') ?? $request->header('X-Session-ID');
    }

    /**
     * Posts a lightweight "X joined the room" system message and broadcasts
     * it exactly like a normal message — the frontend renders it centered
     * and muted (like the date dividers) instead of as a chat bubble, based
     * on the is_system flag. Attributed to the person who joined, not the
     * seller/host — it's informational, not something "said" by the host.
     */
    private function postSystemMessage(Room $room, string $body, ?int $userId = null): void
    {
        try {
            $msg = RoomMessage::create([
                'room_id'   => $room->id,
                'user_id'   => $userId ?? $room->seller_id,
                'body'      => $body,
                'is_system' => true,
            ]);
            $msg->loadMissing('user:id,name,username,avatar');
            broadcast(new RoomMessageSent($msg))->toOthers();
        } catch (\Throwable) {
            // Non-critical — never block the join flow over a system message failing.
        }
    }

    private function getJoinedRooms(User $user): \Illuminate\Support\Collection
    {
        $uid = $user->id;

        return DB::table('rooms')
            ->join('room_user', 'rooms.id', '=', 'room_user.room_id')
            ->where('room_user.user_id', $uid)
            ->select([
                'rooms.*',
                'room_user.role as pivot_role',
                'room_user.last_read_at',
                DB::raw("EXISTS(
                    SELECT 1 FROM room_messages
                    WHERE room_messages.room_id = rooms.id
                    AND room_messages.created_at > COALESCE(room_user.last_read_at, '1970-01-01'::timestamp)
                ) as has_unread"),
            ])
            ->orderByDesc('has_unread')
            ->orderByDesc('rooms.updated_at')
            ->get()
            ->map(function ($r) {
                $room = Room::find($r->id);
                if (!$room) return null;
                $room->load('seller:id,name,username,avatar,is_verified');
                return array_merge($this->serialiseRoom($room), [
                    'has_unread' => (bool) $r->has_unread,
                    'pivot_role' => $r->pivot_role,
                ]);
            })
            ->filter()
            ->values();
    }

    private function serialiseRoom(Room $room): array
    {
        $data                = $room->toArray();
        $data['avatar_url']  = $room->avatar_url;
        $data['invite_code'] = $room->invite_code ?? null;
        if ($room->relationLoaded('seller') && $room->seller) {
            $data['seller']['avatar_url'] = $room->seller->avatar_url;
        }
        return $data;
    }

    private function serialiseMessage(RoomMessage $msg): array
    {
        $data = $msg->toArray();
        if ($msg->relationLoaded('user') && $msg->user) {
            $data['user']['avatar_url'] = $msg->user->avatar_url;
        }
        if ($msg->relationLoaded('replyTo') && $msg->replyTo?->user) {
            $data['reply_to']['user']['avatar_url'] = $msg->replyTo->user->avatar_url;
        }
        return $data;
    }
}