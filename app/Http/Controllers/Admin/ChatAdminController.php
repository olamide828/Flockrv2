<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\StorageService;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Direct-message oversight. Reading a conversation is written to the audit log (who looked, when), removing a message and
 * restricting a person's chat are audit-logged too. Room moderation lives in RoomAdminController.
 */
class ChatAdminController extends Controller
{
    private function url(?string $path): ?string
    {
        if (!$path) return null;
        if (str_starts_with($path, 'http')) return $path;
        try { return app(StorageService::class)->url($path); } catch (\Throwable) { return null; }
    }

    /** GET /api/admin/chats?search=&filter=restricted */
    public function index(Request $request): JsonResponse
    {
        $q = DB::table('conversations');

        if ($s = trim((string) $request->input('search'))) {
            $clean = ltrim($s, '@');
            $q->whereExists(fn ($w) => $w->select(DB::raw(1))->from('conversation_user as cu')->join('users as u', 'u.id', '=', 'cu.user_id')
                ->whereColumn('cu.conversation_id', 'conversations.id')
                ->where(fn ($x) => $x->where('u.username', 'ilike', "%{$clean}%")->orWhere('u.name', 'ilike', "%{$s}%")));
        }
        if ($request->input('filter') === 'restricted' && Schema::hasTable('chat_restrictions')) {
            $q->whereExists(fn ($w) => $w->select(DB::raw(1))->from('conversation_user as cu')->join('chat_restrictions as r', 'r.user_id', '=', 'cu.user_id')
                ->whereColumn('cu.conversation_id', 'conversations.id')->whereNull('r.lifted_at')
                ->where(fn ($x) => $x->whereNull('r.until')->orWhere('r.until', '>', now())));
        }

        $page = $q->orderByDesc('conversations.updated_at')->paginate(20);
        $ids = $page->pluck('id');

        $people = DB::table('conversation_user as cu')->join('users as u', 'u.id', '=', 'cu.user_id')
            ->whereIn('cu.conversation_id', $ids)->get(['cu.conversation_id', 'u.id', 'u.name', 'u.username', 'u.avatar'])->groupBy('conversation_id');
        $counts = DB::table('messages')->whereIn('conversation_id', $ids)->groupBy('conversation_id')
            ->selectRaw('conversation_id, count(*) as total, max(created_at) as last_at, sum(case when is_deleted then 1 else 0 end) as removed')->get()->keyBy('conversation_id');

        $page->through(function ($c) use ($people, $counts) {
            $n = $counts->get($c->id);
            return [
                'id'           => $c->id,
                'people'       => ($people[$c->id] ?? collect())->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'username' => $u->username, 'avatar_url' => $this->url($u->avatar)])->values(),
                'messages'     => (int) ($n->total ?? 0),
                'removed'      => (int) ($n->removed ?? 0),
                'last_at'      => $n->last_at ?? $c->updated_at,
                'created_at'   => $c->created_at,
            ];
        });

        $active = Schema::hasTable('chat_restrictions')
            ? DB::table('chat_restrictions')->whereNull('lifted_at')->where(fn ($x) => $x->whereNull('until')->orWhere('until', '>', now()))->count() : 0;

        return response()->json([
            'rows'  => $page,
            'stats' => [
                'conversations' => DB::table('conversations')->count(),
                'messages_24h'  => DB::table('messages')->where('created_at', '>=', now()->subDay())->count(),
                'restricted'    => $active,
            ],
        ]);
    }

    /** GET /api/admin/chats/{id}/messages?before=  (opening a chat is logged) */
    public function messages(Request $request, int $id): JsonResponse
    {
        abort_unless(DB::table('conversations')->where('id', $id)->exists(), 404);

        $q = DB::table('messages')->leftJoin('users', 'users.id', '=', 'messages.sender_id')
            ->where('messages.conversation_id', $id)
            ->select('messages.id', 'messages.body', 'messages.media_path', 'messages.media_type', 'messages.is_deleted', 'messages.created_at', 'users.id as user_id', 'users.name', 'users.username')
            ->orderByDesc('messages.id');
        if ($b = $request->integer('before')) $q->where('messages.id', '<', $b);

        $rows = $q->limit(40)->get()->map(function ($m) {
            $m->media_url = $this->url($m->media_path);
            unset($m->media_path);
            return $m;
        });

        if (!$request->integer('before')) Audit::log('chat.viewed', null, ['conversation_id' => $id]);

        return response()->json(['messages' => $rows]);
    }

    /** DELETE /api/admin/chats/{id}/messages/{message}  body: reason */
    public function deleteMessage(Request $request, int $id, int $message): JsonResponse
    {
        $row = DB::table('messages')->where('conversation_id', $id)->where('id', $message)->first();
        abort_unless($row, 404);

        DB::table('messages')->where('id', $message)->update(['is_deleted' => true]);
        try { broadcast(new \App\Events\MessageDeleted($message, $id)); } catch (\Throwable) {}

        Audit::log('chat.message_removed', null, ['conversation_id' => $id, 'message_id' => $message, 'author_id' => $row->sender_id, 'reason' => $request->input('reason')]);
        return response()->json(['message' => 'Message removed.']);
    }

    /** GET /api/admin/chats/restrictions */
    public function restrictions(): JsonResponse
    {
        if (!Schema::hasTable('chat_restrictions')) return response()->json(['rows' => ['data' => []], 'missing_table' => true]);

        $page = DB::table('chat_restrictions as r')->leftJoin('users as u', 'u.id', '=', 'r.user_id')
            ->orderByRaw('(r.lifted_at is null) desc')->orderByDesc('r.id')
            ->select('r.*', 'u.name', 'u.username')->paginate(20);
        $page->through(fn ($r) => [
            'id' => $r->id, 'user' => ['id' => $r->user_id, 'name' => $r->name, 'username' => $r->username], 'scope' => $r->scope, 'reason' => $r->reason,
            'until' => $r->until, 'lifted_at' => $r->lifted_at, 'created_at' => $r->created_at,
            'active' => !$r->lifted_at && (!$r->until || $r->until > now()->toDateTimeString()),
        ]);
        return response()->json(['rows' => $page]);
    }

    /** POST /api/admin/chats/restrict  {user_id, scope: all|dm|rooms, days?, reason} */
    public function restrict(Request $request): JsonResponse
    {
        $d = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'scope'   => 'required|in:all,dm,rooms',
            'days'    => 'nullable|integer|min:1|max:365',
            'reason'  => 'required|string|max:300',
        ]);
        $user = \App\Models\User::findOrFail($d['user_id']);
        abort_if($user->role === 'admin', 422, 'You cannot restrict an admin.');

        $id = DB::table('chat_restrictions')->insertGetId([
            'user_id' => $user->id, 'scope' => $d['scope'], 'reason' => $d['reason'], 'admin_id' => $request->user()->id,
            'until' => !empty($d['days']) ? now()->addDays((int) $d['days']) : null, 'created_at' => now(), 'updated_at' => now(),
        ]);
        Audit::log('chat.restricted', $user, ['restriction_id' => $id, 'scope' => $d['scope'], 'days' => $d['days'] ?? null, 'reason' => $d['reason']]);
        return response()->json(['message' => 'Chat restricted.', 'id' => $id], 201);
    }

    /** POST /api/admin/chats/restrictions/{id}/lift */
    public function lift(int $id): JsonResponse
    {
        $r = DB::table('chat_restrictions')->where('id', $id)->first();
        abort_unless($r, 404);
        DB::table('chat_restrictions')->where('id', $id)->update(['lifted_at' => now(), 'updated_at' => now()]);
        Audit::log('chat.restriction_lifted', null, ['restriction_id' => $id, 'user_id' => $r->user_id]);
        return response()->json(['message' => 'Restriction lifted.']);
    }
}
