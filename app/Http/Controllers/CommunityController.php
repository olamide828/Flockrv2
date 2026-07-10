<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CommunityController extends Controller
{
    // ── Inertia page ─────────────────────────────────────────────────────────

    public function index(): Response
    {
        $user = Auth::user();

        // Rooms the user has joined (with unread indicator)
        $joinedRooms = $user
            ? $this->getJoinedRoomsFeed($user)
            : collect();

        // Public rooms for discovery (not yet joined)
        $discoverRooms = Room::where('is_private', false)
            ->with('seller:id,name,username,avatar,is_verified')
            // ->withCount('members')
            ->when($user, fn($q) => $q->whereNotIn('id', $joinedRooms->pluck('id')))
            ->orderByDesc('members_count')
            ->limit(12)
            ->get()
            ->map(fn($r) => $this->serialiseRoom($r));

        return Inertia::render('Community/Index', [
            'joinedRooms'   => $joinedRooms,
            'discoverRooms' => $discoverRooms,
        ]);
    }

    // ── Feed endpoints ────────────────────────────────────────────────────────

    /**
     * GET /api/community/feed?type=general|rooms|room&room_id=X
     *
     * type=general  → global timeline (room_id IS NULL)
     * type=rooms    → aggregated feed from all joined rooms
     * type=room     → single room feed
     */
    public function feed(Request $request): JsonResponse
    {
        $type   = $request->get('type', 'general');
        $roomId = $request->get('room_id');
        $user   = Auth::user();

        $query = Post::with([
            'user:id,name,username,avatar,is_verified',
            'room:id,name,slug,avatar',
        ])->latest();

        // Attach is_liked_by_me
        if ($user) {
            $query->addSelect([
                '*',
                DB::raw("EXISTS(SELECT 1 FROM post_likes WHERE post_id = posts.id AND user_id = {$user->id}) as is_liked_by_me"),
            ]);
        }

        match ($type) {
            'general' => $query->whereNull('room_id'),

            'rooms' => $user
                ? $query->whereIn('room_id',
                    DB::table('room_user')
                        ->where('user_id', $user->id)
                        ->pluck('room_id')
                  )
                : $query->whereRaw('1=0'),  // no results if not logged in

            'room' => $query->where('room_id', $roomId),

            default => $query->whereNull('room_id'),
        };

        $posts = $query->paginate(20);

        $posts->getCollection()->transform(fn($p) => array_merge($p->toArray(), [
            'user' => $p->user ? array_merge($p->user->toArray(), ['avatar_url' => $p->user->avatar_url]) : null,
        ]));

        return response()->json($posts);
    }

    /**
     * GET /api/community/rooms/joined
     * Returns user's joined rooms with unread indicator.
     */
    public function joinedRooms(): JsonResponse
    {
        $user = Auth::user();
        if (!$user) return response()->json([]);

        return response()->json($this->getJoinedRoomsFeed($user));
    }

    // ── Post CRUD ─────────────────────────────────────────────────────────────

    /**
     * POST /api/community/posts
     */
    public function storePost(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content'    => 'required|string|max:2000',
            'room_id'    => 'nullable|integer|exists:rooms,id',
            'media_url'  => 'nullable|url|max:500',
            'media_type' => 'nullable|in:image,video',
        ]);

        // If posting to a room, user must be a member
        if (!empty($validated['room_id'])) {
            $isMember = DB::table('room_user')
                ->where('room_id', $validated['room_id'])
                ->where('user_id', Auth::id())
                ->exists();
            if (!$isMember) {
                return response()->json(['message' => 'Join this room to post.'], 403);
            }
        }

        $post = Post::create([
            'user_id'    => Auth::id(),
            'room_id'    => $validated['room_id'] ?? null,
            'content'    => $validated['content'],
            'media_url'  => $validated['media_url'] ?? null,
            'media_type' => $validated['media_type'] ?? null,
        ]);

        // Increment room post count
        if ($post->room_id) {
            Room::where('id', $post->room_id)->increment('posts_count');

            // Update last_read_at for the author
            DB::table('room_user')
                ->where('room_id', $post->room_id)
                ->where('user_id', Auth::id())
                ->update(['last_read_at' => now()]);
        }

        $post->load('user:id,name,username,avatar,is_verified', 'room:id,name,slug,avatar');

        return response()->json(array_merge($post->toArray(), [
            'is_liked_by_me' => false,
            'user'           => array_merge($post->user->toArray(), ['avatar_url' => $post->user->avatar_url]),
        ]), 201);
    }

    /**
     * POST /api/community/posts/{post}/like
     */
    public function likePost(Post $post): JsonResponse
    {
        $userId = Auth::id();
        $liked  = DB::table('post_likes')
            ->where('post_id', $post->id)
            ->where('user_id', $userId)
            ->exists();

        if ($liked) {
            DB::table('post_likes')->where('post_id', $post->id)->where('user_id', $userId)->delete();
            $post->decrement('likes_count');
        } else {
            DB::table('post_likes')->insertOrIgnore(['post_id' => $post->id, 'user_id' => $userId, 'created_at' => now(), 'updated_at' => now()]);
            $post->increment('likes_count');
        }

        return response()->json([
            'liked'       => !$liked,
            'likes_count' => max(0, $post->fresh()->likes_count),
        ]);
    }

    /**
     * DELETE /api/community/posts/{post}
     */
    public function destroyPost(Post $post): JsonResponse
    {
        abort_unless(Auth::id() === $post->user_id || Auth::user()->isAdmin(), 403);

        if ($post->room_id) {
            Room::where('id', $post->room_id)->decrement('posts_count');
        }
        $post->delete();

        return response()->json(['message' => 'Post deleted.']);
    }

    // ── Room CRUD ─────────────────────────────────────────────────────────────

    /**
     * POST /api/community/rooms
     * Create a room — sellers only.
     */
    public function storeRoom(Request $request): JsonResponse
    {
        abort_unless(Auth::user()->role === 'seller' || Auth::user()->isAdmin(), 403);

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
        ]);

        // Seller auto-joins their own room as moderator
        $room->members()->attach(Auth::id(), ['role' => 'moderator', 'last_read_at' => now()]);
        $room->increment('members_count');

        $room->load('seller:id,name,username,avatar,is_verified');

        return response()->json(array_merge($room->toArray(), ['has_unread' => false]), 201);
    }

    /**
     * POST /api/community/rooms/{room}/join
     */
    public function joinRoom(Room $room): JsonResponse
    {
        $userId    = Auth::id();
        $isMember  = $room->members()->where('user_id', $userId)->exists();

        if ($isMember) {
            // Leave
            $room->members()->detach($userId);
            $room->decrement('members_count');
            return response()->json(['joined' => false, 'members_count' => max(0, $room->fresh()->members_count)]);
        }

        // Join
        $room->members()->attach($userId, ['role' => 'member', 'last_read_at' => now()]);
        $room->increment('members_count');

        return response()->json(['joined' => true, 'members_count' => $room->fresh()->members_count]);
    }

    /**
     * DELETE /api/community/rooms/{room}/kick
     * Kick a user — seller only, enforced by RoomPolicy.
     */
    public function kickUser(Request $request, Room $room): JsonResponse
    {
        $this->authorize('kick', $room);

        $validated = $request->validate(['user_id' => 'required|integer|exists:users,id']);

        // Can't kick yourself
        if ($validated['user_id'] === Auth::id()) {
            return response()->json(['message' => 'You cannot kick yourself.'], 422);
        }

        $room->members()->detach($validated['user_id']);
        $room->decrement('members_count');

        return response()->json(['message' => 'Member removed.']);
    }

    /**
     * PUT /api/community/rooms/{room}/rules
     * Update room rules — seller only.
     */
    public function updateRules(Request $request, Room $room): JsonResponse
    {
        $this->authorize('updateRules', $room);

        $validated = $request->validate([
            'rules' => 'required|array',
            'rules.*' => 'string|max:200',
        ]);

        $room->update(['rules' => $validated['rules']]);

        return response()->json(['message' => 'Rules updated.', 'rules' => $room->rules]);
    }

    /**
     * GET /api/community/rooms/{room}/members
     */
    public function roomMembers(Room $room): JsonResponse
    {
        $members = $room->members()
            ->select('users.id', 'users.name', 'users.username', 'users.avatar', 'users.is_verified')
            ->withPivot('role', 'last_read_at')
            ->orderByRaw("CASE WHEN room_user.role = 'moderator' THEN 0 ELSE 1 END")
            ->get()
            ->map(fn($u) => array_merge($u->toArray(), ['avatar_url' => $u->avatar_url]));

        return response()->json($members);
    }

    /**
     * GET /api/community/rooms/discover
     */
    public function discoverRooms(): JsonResponse
    {
        $userId = Auth::id();

        $joined = $userId
            ? DB::table('room_user')->where('user_id', $userId)->pluck('room_id')->toArray()
            : [];

        $rooms = Room::where('is_private', false)
            ->whereNotIn('id', $joined)
            ->with('seller:id,name,username,avatar,is_verified')
            // ->withCount('members')
            ->orderByDesc('members_count')
            ->limit(20)
            ->get()
            ->map(fn($r) => $this->serialiseRoom($r));

        return response()->json($rooms);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function getJoinedRoomsFeed(User $user): \Illuminate\Support\Collection
    {
        return $user->rooms()
            ->with('seller:id,name,username,avatar,is_verified')
            // ->withCount('members')
            ->withPivot('last_read_at')
            // Subquery: does this room have posts newer than last_read_at?
            ->addSelect([
                'rooms.*',
                DB::raw("EXISTS(
                    SELECT 1 FROM posts
                    WHERE posts.room_id = rooms.id
                    AND posts.deleted_at IS NULL
                    AND posts.created_at > COALESCE(
                        (SELECT last_read_at FROM room_user
                         WHERE room_user.room_id = rooms.id
                         AND room_user.user_id = {$user->id}
                         LIMIT 1),
                        '1970-01-01'
                    )
                ) as has_unread"),
            ])
            ->orderByDesc('has_unread')
            ->orderByDesc('rooms.updated_at')
            ->get()
            ->map(fn($r) => array_merge($this->serialiseRoom($r), [
                'has_unread' => (bool) $r->has_unread,
                'pivot_role' => $r->pivot?->role ?? 'member',
            ]));
    }

    private function serialiseRoom(Room $room): array
    {
        return array_merge($room->toArray(), [
            'avatar_url' => $room->avatar_url,
            'seller'     => $room->relationLoaded('seller') && $room->seller
                ? array_merge($room->seller->toArray(), ['avatar_url' => $room->seller->avatar_url])
                : null,
        ]);
    }
}