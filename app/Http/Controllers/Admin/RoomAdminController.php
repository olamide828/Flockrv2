<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Community room oversight. Uses the query builder so it doesn't depend on Room model details. */
class RoomAdminController extends Controller
{
    /** GET /api/admin/rooms?search=&visibility=&status= */
    public function index(Request $request): JsonResponse
    {
        $hasClosed = Schema::hasColumn('rooms', 'closed_at');

        $q = DB::table('rooms')->leftJoin('users', 'users.id', '=', 'rooms.seller_id')
            ->select('rooms.*', 'users.name as owner_name', 'users.username as owner_username');

        if ($s = trim((string) $request->input('search'))) {
            $q->where(fn ($w) => $w->where('rooms.name', 'ilike', "%{$s}%")->orWhere('users.username', 'ilike', "%{$s}%"));
        }
        if ($request->input('visibility') === 'private') $q->where('rooms.is_private', true);
        if ($request->input('visibility') === 'public')  $q->where('rooms.is_private', false);
        if ($hasClosed) {
            if ($request->input('status') === 'closed') $q->whereNotNull('rooms.closed_at');
            if ($request->input('status') === 'open')   $q->whereNull('rooms.closed_at');
        }

        $rows = $q->orderByDesc('rooms.updated_at')->paginate(20)->through(function ($r) use ($hasClosed) {
            $day = DB::table('room_messages')->where('room_id', $r->id)->where('created_at', '>=', now()->subDay());
            return [
                'id'             => $r->id,
                'name'           => $r->name,
                'description'    => $r->description ?? null,
                'is_private'     => (bool) $r->is_private,
                'members_count'  => (int) ($r->members_count ?? 0),
                'messages_24h'   => (clone $day)->count(),
                'removed_total'  => DB::table('room_messages')->where('room_id', $r->id)->where('is_deleted', true)->count(),
                'closed'         => $hasClosed && !empty($r->closed_at),
                'closed_at'      => $hasClosed ? ($r->closed_at ?? null) : null,
                'owner'          => ['id' => $r->seller_id, 'name' => $r->owner_name, 'username' => $r->owner_username],
                'created_at'     => $r->created_at,
            ];
        });

        return response()->json([
            'rows'  => $rows,
            'stats' => [
                'total'    => DB::table('rooms')->count(),
                'private'  => DB::table('rooms')->where('is_private', true)->count(),
                'closed'   => $hasClosed ? DB::table('rooms')->whereNotNull('closed_at')->count() : 0,
                'messages_24h' => DB::table('room_messages')->where('created_at', '>=', now()->subDay())->count(),
            ],
            'can_close' => $hasClosed,
        ]);
    }

    /** GET /api/admin/rooms/{id}/messages?before= */
    public function messages(Request $request, int $id): JsonResponse
    {
        $q = DB::table('room_messages')->leftJoin('users', 'users.id', '=', 'room_messages.user_id')
            ->where('room_messages.room_id', $id)
            ->select('room_messages.id', 'room_messages.body', 'room_messages.media_url', 'room_messages.media_type', 'room_messages.is_deleted', 'room_messages.created_at',
                     'users.id as user_id', 'users.name', 'users.username')
            ->orderByDesc('room_messages.id');
        if ($b = $request->integer('before')) $q->where('room_messages.id', '<', $b);

        return response()->json(['messages' => $q->limit(40)->get()]);
    }

    /** DELETE /api/admin/rooms/{room}/messages/{message} — same soft-delete the app itself uses */
    public function deleteMessage(Request $request, int $room, int $message): JsonResponse
    {
        $row = DB::table('room_messages')->where('room_id', $room)->where('id', $message)->first();
        abort_unless($row, 404);

        DB::table('room_messages')->where('id', $message)->update(['is_deleted' => true, 'body' => null, 'media_url' => null, 'media_type' => null]);
        try { broadcast(new \App\Events\RoomMessageDeleted($room, $message)); } catch (\Throwable) {}

        Audit::log('room.message_removed', null, ['room_id' => $room, 'message_id' => $message, 'author_id' => $row->user_id, 'reason' => $request->input('reason')]);
        return response()->json(['message' => 'Message removed.']);
    }

    /** POST /api/admin/rooms/{id}/close|restore */
    public function close(Request $request, int $id): JsonResponse
    {
        abort_unless(Schema::hasColumn('rooms', 'closed_at'), 422, 'Run the latest migration first.');
        $request->validate(['reason' => 'required|string|max:300']);
        DB::table('rooms')->where('id', $id)->update(['closed_at' => now()]);
        Audit::log('room.close', null, ['room_id' => $id, 'reason' => $request->reason]);
        return response()->json(['message' => 'Room closed.']);
    }

    public function restore(int $id): JsonResponse
    {
        abort_unless(Schema::hasColumn('rooms', 'closed_at'), 422, 'Run the latest migration first.');
        DB::table('rooms')->where('id', $id)->update(['closed_at' => null]);
        Audit::log('room.restore', null, ['room_id' => $id]);
        return response()->json(['message' => 'Room reopened.']);
    }
}
