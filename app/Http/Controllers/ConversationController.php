<?php

namespace App\Http\Controllers;

use App\Models\ChatWallpaper;
use App\Models\Conversation;
use App\Models\Report;
use App\Models\User;
use App\Models\UserBlock;
use App\Events\NewMessageToast;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ConversationController extends Controller
{
    private const PARTICIPANT_FIELDS = 'id,name,username,avatar,last_seen_at';
    private const SENDER_FIELDS = 'id,name,username,avatar,last_seen_at';

    public function index()
    {
        $user = Auth::user();
        $this->ensureSupportConversation($user);

        $blockedIds = UserBlock::where('blocker_id', $user->id)->pluck('blocked_id')->toArray();
        $blockedByIds = UserBlock::where('blocked_id', $user->id)->pluck('blocker_id')->toArray();
        $whoFollowsMe = DB::table('follows')->where('following_id', $user->id)->pluck('follower_id')->toArray();
        $whoIFollow = DB::table('follows')->where('follower_id', $user->id)->pluck('following_id')->toArray();
        $dismissedIds = DB::table('conversation_request_dismissals')->where('user_id', $user->id)->pluck('conversation_id')->toArray();

        $storage = app(StorageService::class);

        $allConvs = $user->conversations()
            ->with([
                'participants' => function ($q) {
                    $fields = array_merge(explode(',', self::PARTICIPANT_FIELDS), ['role', 'is_flockr_support', 'is_verified']);
                    $qualifiedFields = array_map(fn($field) => "users.{$field}", $fields);
                    $q->select($qualifiedFields)->withPivot('chat_theme', 'chat_wallpaper_id')->withActiveSubscriptionFlag();
                },
                'lastMessage.sender:' . self::SENDER_FIELDS,
            ])
            ->withCount(['messages as unread_count' => fn($q) => $q->whereNull('read_at')->where('sender_id', '!=', Auth::id())])
            ->latest('updated_at')
            ->get();

        $convIds = $allConvs->pluck('id');
        $this->markDelivered($convIds->all());
        $sentByMeIds = DB::table('messages')->where('sender_id', $user->id)->whereIn('conversation_id', $convIds)->distinct()->pluck('conversation_id')->toArray();
        $sentByOtherIds = DB::table('messages')->where('sender_id', '!=', $user->id)->whereIn('conversation_id', $convIds)->distinct()->pluck('conversation_id')->toArray();

        $mySentCounts = DB::table('messages')->where('sender_id', $user->id)->whereIn('conversation_id', $convIds)->groupBy('conversation_id')->selectRaw('conversation_id, count(*) as c')->pluck('c', 'conversation_id')->all();

        $wallpaperIds = DB::table('conversation_user')->whereIn('conversation_id', $convIds)->whereNotNull('chat_wallpaper_id')->pluck('chat_wallpaper_id')->unique();
        $wallpapers = ChatWallpaper::whereIn('id', $wallpaperIds)->get()->keyBy('id');

        $mapped = $allConvs->map(function ($conv) use ($blockedIds, $blockedByIds, $whoFollowsMe, $whoIFollow, $sentByMeIds, $sentByOtherIds, $dismissedIds, $storage, $wallpapers, $user, $mySentCounts) {
            $conv->participants->each(function ($p) use ($blockedIds, $blockedByIds, $whoFollowsMe, $whoIFollow, $storage, $wallpapers) {
                $p->setAttribute('is_blocked_by_me', in_array($p->id, $blockedIds));
                $p->setAttribute('has_blocked_me', in_array($p->id, $blockedByIds));
                $p->setAttribute('follows_me', in_array($p->id, $whoFollowsMe));
                $p->setAttribute('i_follow_them', in_array($p->id, $whoIFollow));
                $p->setAttribute('conversation_chat_theme', $p->pivot->chat_theme ?? 'off');
                $wallpaperId = $p->pivot->chat_wallpaper_id;
                $wallpaper = $wallpaperId ? $wallpapers->get($wallpaperId) : null;
                $p->setAttribute('conversation_wallpaper_url', $wallpaper ? $storage->url($wallpaper->image_path) : null);
            });

            // Someone who isn't following you (and hasn't replied) must not see when you were last online
            $otherSpoke = in_array($conv->id, $sentByOtherIds);
            $conv->participants->each(function ($p) use ($user, $otherSpoke) {
                if ($p->id === $user->id) return;
                if (!($p->is_flockr_support || $p->role === 'admin' || $p->follows_me || $otherSpoke)) $p->setAttribute('last_seen_at', null);
            });

            $other = $conv->participants->first(fn($p) => $p->id !== $user->id);
            // Out of message-request messages: 3 sent, they don't follow me and haven't replied
            $conv->setAttribute('request_limit_reached', (bool) ($other && !$other->is_flockr_support && !$other->follows_me && !$otherSpoke && (($mySentCounts[$conv->id] ?? 0) >= 3)));
            $isPendingRequestForMe = $other
                && !$other->is_flockr_support
                && !in_array($other->id, $whoIFollow)
                && in_array($conv->id, $sentByOtherIds)
                && !in_array($conv->id, $sentByMeIds)
                && !in_array($conv->id, $dismissedIds);

            $conv->setAttribute('is_pending_request', $isPendingRequestForMe);
            $conv->setAttribute('request_dismissed', in_array($conv->id, $dismissedIds));
            $conv->setAttribute('is_support', $conv->participants->contains(fn($p) => $p->is_flockr_support));
            return $conv;
        });

        $conversations = $mapped->reject(fn($c) => $c->is_pending_request)
            ->sortByDesc(fn($c) => $c->is_support ? 1 : 0)
            ->values();

        // The Inbox polls this URL for fresh flags (e.g. "they followed back") and wants JSON, not the page
        if (request()->expectsJson() && !request()->header('X-Inertia')) {
            return response()->json($conversations);
        }

        return Inertia::render('Inbox/Index', [
            'conversations' => $conversations,
            'blockedByMeIds' => $blockedIds,
            'blockedByOtherIds' => $blockedByIds,
            'pendingRequestsCount' => $mapped->where('is_pending_request', true)->count(),
        ]);
    }



    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['user_id' => 'required|integer|exists:users,id']);
        $other = User::findOrFail($validated['user_id']);

        if ($other->id === Auth::id()) {
            return response()->json(['message' => 'Cannot message yourself.'], 422);
        }

        $blocked = UserBlock::where(function ($q) use ($other) {
            $q->where('blocker_id', Auth::id())->where('blocked_id', $other->id);
        })->orWhere(function ($q) use ($other) {
            $q->where('blocker_id', $other->id)->where('blocked_id', Auth::id());
        })->exists();

        if ($blocked) {
            return response()->json(['message' => 'Cannot start a conversation with this user.'], 403);
        }

        $existing = Auth::user()
            ->conversations()
            ->whereHas('participants', fn($q) => $q->where('user_id', $other->id))
            ->with([
                'participants:' . self::PARTICIPANT_FIELDS . ',role,is_flockr_support',
                'lastMessage',
            ])
            ->withCount([
                'messages as unread_count' => function ($q) {
                    $q->whereNull('read_at')->where('sender_id', '!=', Auth::id());
                }
            ])
            ->first();

        if ($existing) {
            $this->hideStatus($existing, Auth::user());
            return response()->json($existing);
        }

        $conv = Conversation::create();
        $conv->participants()->attach([Auth::id(), $other->id]);

        $conv->load('participants:' . self::PARTICIPANT_FIELDS . ',role,is_flockr_support');
        $this->hideStatus($conv, Auth::user());
        return response()->json($conv, 201);
    }

    public function messages(Conversation $conversation): JsonResponse
    {
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $messages = $conversation->messages()
            ->with('sender:' . self::SENDER_FIELDS, 'replyTo:id,body,sender_id,media_type', 'replyTo.sender:id,name')
            ->orderBy('created_at', 'asc')
            ->get();

        $storage = app(StorageService::class);
        \App\Models\Message::fillProducts($messages->filter(fn ($m) => !$m->is_deleted));
        $this->hideSenderStatus($conversation, $messages);

        // Emoji reactions for the whole thread in one query: [{emoji, user_id}]
        $reactionRows = DB::table('message_reactions')->whereIn('message_id', $messages->pluck('id'))
            ->get(['message_id', 'emoji', 'user_id'])->groupBy('message_id');

        $messages = $messages->map(function ($m) use ($storage, $reactionRows) {
            $m->setAttribute('reactions', ($reactionRows[$m->id] ?? collect())->map(fn ($r) => ['emoji' => $r->emoji, 'user_id' => (int) $r->user_id])->values()->all());
            if ($m->is_deleted) {
                $m->setAttribute('body', '');
                $m->setAttribute('media_url', null);
                $m->setAttribute('suggested_products', []);
                return $m;
            }
            if ($m->media_path) {
                $m->setAttribute('media_url', $storage->url($m->media_path));
            }
            return $m;
        });

        $this->markDelivered([$conversation->id]);

        $conversation->messages()
            ->where('sender_id', '!=', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'delivered_at' => DB::raw('COALESCE(delivered_at, NOW())')]);

        return response()->json($messages);
    }

    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // A retried send (same client_id) returns the message that already went through instead of posting it twice
        $clientId = substr((string) $request->input('client_id', ''), 0, 64) ?: null;
        if ($clientId) {
            $dupe = $conversation->messages()->where('sender_id', Auth::id())->where('client_id', $clientId)->first();
            if ($dupe) {
                $dupe->load('sender:' . self::SENDER_FIELDS, 'replyTo:id,body,sender_id,media_type', 'replyTo.sender:id,name');
                if ($dupe->media_path) $dupe->setAttribute('media_url', app(StorageService::class)->url($dupe->media_path));
                return response()->json($dupe, 200);
            }
        }

        if ($restriction = \App\Support\ChatRestriction::active(Auth::id(), 'dm')) {
            return response()->json(['message' => \App\Support\ChatRestriction::message($restriction), 'chat_restricted' => true], 403);
        }

        $otherParticipant = $conversation->participants()
            ->where('user_id', '!=', Auth::id())
            ->first();

        if ($otherParticipant) {
            $blocked = UserBlock::where(function ($q) use ($otherParticipant) {
                $q->where('blocker_id', Auth::id())->where('blocked_id', $otherParticipant->id);
            })->orWhere(function ($q) use ($otherParticipant) {
                $q->where('blocker_id', $otherParticipant->id)->where('blocked_id', Auth::id());
            })->exists();

            if ($blocked) {
                return response()->json(['message' => 'Cannot send message to this user.'], 403);
            }
        }


        if ($otherParticipant) {
            $theyFollowMe = DB::table('follows')->where('follower_id', $otherParticipant->id)->where('following_id', Auth::id())->exists();

            // The limit only applies while they have neither followed you back nor replied: once they answer, you can chat freely
            $theyReplied = $conversation->messages()->where('sender_id', $otherParticipant->id)->exists();

            if (!$theyFollowMe && !$theyReplied && !$otherParticipant->is_flockr_support) {
                $mySentCount = $conversation->messages()->where('sender_id', Auth::id())->count();
                if ($mySentCount >= 3) {
                    return response()->json([
                        'message' => "You've reached the message request limit. When @{$otherParticipant->username} replies or follows you back, you'll be able to keep chatting.",
                        'request_limit_reached' => true,
                    ], 403);
                }
            }
        }

        $request->validate([
    'body'        => 'nullable|string|max:1000',
    'media'       => 'nullable|file|mimes:jpg,jpeg,png,webp,mp4,mov|max:20480',
    'reply_to_id' => 'nullable|integer|exists:messages,id',
    'client_id'   => 'nullable|string|max:64',
]);

        $bodyText = trim((string) $request->input('body', ''));

        if ($bodyText === '' && !$request->hasFile('media')) {
            return response()->json(['message' => 'Message cannot be empty.'], 422);
        }

        $mediaPath = null;
        $mediaType = null;
        if ($request->hasFile('media')) {
            $file = $request->file('media');
            $mediaType = str_starts_with($file->getMimeType(), 'video') ? 'video' : 'image';
            $mediaPath = app(StorageService::class)->uploadCommunityMedia($file, $mediaType);
        }

        try {
            $message = $conversation->messages()->create([
                'sender_id'   => Auth::id(),
                'body'        => $bodyText,
                'media_path'  => $mediaPath,
                'media_type'  => $mediaType,
                'reply_to_id' => $request->input('reply_to_id'),
                'client_id'   => $clientId,
            ]);
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            // Two identical retries raced: the first one won, return it
            $message = $conversation->messages()->where('sender_id', Auth::id())->where('client_id', $clientId)->firstOrFail();
        }

        // ✓✓ straight away when the other person is online right now
        if ($otherParticipant && !$message->delivered_at && $otherParticipant->is_online) {
            $message->forceFill(['delivered_at' => now()])->save();
        }

        $message->load('sender:' . self::SENDER_FIELDS, 'replyTo:id,body,sender_id,media_type', 'replyTo.sender:id,name');
        if ($message->media_path) {
            $message->setAttribute('media_url', app(StorageService::class)->url($message->media_path));
        }
        $conversation->touch();

        try {
            broadcast(new \App\Events\MessageSent($message, $conversation))->toOthers();
        } catch (\Throwable) {
        }


        if ($otherParticipant) {
            try {
                broadcast(new NewMessageToast($message, $otherParticipant, $conversation->id));
            } catch (\Throwable) {
            }
        }


        if ($otherParticipant && $otherParticipant->is_flockr_support) {
            \App\Jobs\GenerateSupportReply::dispatch($conversation->id, $message->id);
        }

        return response()->json($message, 201);
    }



    public function deleteMessage(Conversation $conversation, \App\Models\Message $message): JsonResponse
    {
        if ((int) $message->conversation_id !== (int) $conversation->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }
        if ((int) $message->sender_id !== (int) Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // forceFill: is_deleted is not mass-assignable on older copies of the model, and update() would throw there (the server error)
        $message->forceFill(['is_deleted' => true])->save();

        $masked = $message->replicate();
        $masked->id = $message->id;
        $masked->setAttribute('body', '');
        $masked->setAttribute('media_url', null);
        $masked->setAttribute('suggested_products', []);
        $masked->setAttribute('is_deleted', true);
        $masked->created_at = $message->created_at;

        try {
            broadcast(new \App\Events\MessageDeleted($message->id, $conversation->id))->toOthers();
        } catch (\Throwable) {}

        return response()->json($masked);
    }

    /** Messages can be edited for this many minutes after sending (same as WhatsApp). */
    private const EDIT_WINDOW_MINUTES = 15;

    /** PATCH /api/conversations/{conversation}/messages/{message}  { body } */
    public function editMessage(Request $request, Conversation $conversation, \App\Models\Message $message): JsonResponse
    {
        if ((int) $message->conversation_id !== (int) $conversation->id) return response()->json(['message' => 'Not found.'], 404);
        if ((int) $message->sender_id !== (int) Auth::id()) return response()->json(['message' => 'You can only edit your own messages.'], 403);
        if ($message->is_deleted) return response()->json(['message' => 'This message was deleted.'], 422);
        if ($message->created_at->lt(now()->subMinutes(self::EDIT_WINDOW_MINUTES))) {
            return response()->json(['message' => 'Messages can only be edited for ' . self::EDIT_WINDOW_MINUTES . ' minutes after sending.'], 422);
        }
        if ($restriction = \App\Support\ChatRestriction::active(Auth::id(), 'dm')) {
            return response()->json(['message' => \App\Support\ChatRestriction::message($restriction), 'chat_restricted' => true], 403);
        }

        $data = $request->validate(['body' => 'required|string|max:1000']);
        $body = trim($data['body']);
        if ($body === '') return response()->json(['message' => 'Message cannot be empty.'], 422);
        if ($body === (string) $message->body) return response()->json(['message' => 'ok', 'body' => $body, 'edited_at' => $message->edited_at]);

        $message->forceFill(['body' => $body, 'edited_at' => now()])->save();

        try {
            broadcast(new \App\Events\MessageUpdated($conversation->id, $message->id, $body, $message->edited_at->toIso8601String(), $this->reactionsOf($message->id)))->toOthers();
        } catch (\Throwable) {}

        return response()->json(['message' => 'ok', 'body' => $body, 'edited_at' => $message->edited_at]);
    }

    /** POST /api/conversations/{conversation}/messages/{message}/react  { emoji }  (same emoji again removes it) */
    public function reactMessage(Request $request, Conversation $conversation, \App\Models\Message $message): JsonResponse
    {
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) return response()->json(['message' => 'Unauthorized.'], 403);
        if ((int) $message->conversation_id !== (int) $conversation->id) return response()->json(['message' => 'Not found.'], 404);
        if ($message->is_deleted) return response()->json(['message' => 'This message was deleted.'], 422);

        $emoji = (string) $request->validate(['emoji' => 'required|string|max:16'])['emoji'];

        $existing = DB::table('message_reactions')->where('message_id', $message->id)->where('user_id', Auth::id())->first();
        if ($existing && $existing->emoji === $emoji) {
            DB::table('message_reactions')->where('id', $existing->id)->delete();
        } else {
            DB::table('message_reactions')->upsert(
                [['message_id' => $message->id, 'user_id' => Auth::id(), 'emoji' => $emoji, 'created_at' => now(), 'updated_at' => now()]],
                ['message_id', 'user_id'], ['emoji', 'updated_at']
            );
        }

        $reactions = $this->reactionsOf($message->id);

        // The inbox list shows the reaction as the latest activity: "You: Reacted 👍 to “How are you?”"
        $added = !($existing && $existing->emoji === $emoji);
        $preview = $message->body !== '' && $message->body !== null
            ? \Illuminate\Support\Str::limit($message->body, 40)
            : ($message->media_type === 'video' ? 'a video' : 'a photo');
        $last = $added ? ['user_id' => Auth::id(), 'emoji' => $emoji, 'preview' => $preview, 'message_id' => $message->id, 'at' => now()->toIso8601String()] : null;
        if ($added) {
            DB::table('conversations')->where('id', $conversation->id)->update(['last_reaction' => json_encode($last), 'updated_at' => now()]);
        } else {
            DB::table('conversations')->where('id', $conversation->id)->whereRaw("(last_reaction::jsonb ->> 'message_id')::int = ? AND (last_reaction::jsonb ->> 'user_id')::int = ?", [$message->id, Auth::id()])->update(['last_reaction' => null]);
        }

        try {
            broadcast(new \App\Events\MessageUpdated($conversation->id, $message->id, null, null, $reactions, $last))->toOthers();
        } catch (\Throwable) {}

        return response()->json(['reactions' => $reactions, 'last_reaction' => $last]);
    }

    /** The person opening their inbox / a chat has now received everything waiting: stamp ✓✓ and tell the senders. */
    private function markDelivered(iterable $conversationIds): void
    {
        try {
            $rows = DB::table('messages')->whereIn('conversation_id', $conversationIds)
                ->where('sender_id', '!=', Auth::id())->whereNull('delivered_at')
                ->groupBy('conversation_id')->selectRaw('conversation_id, max(id) as up_to')->get();
            if ($rows->isEmpty()) return;

            DB::table('messages')->whereIn('conversation_id', $rows->pluck('conversation_id'))
                ->where('sender_id', '!=', Auth::id())->whereNull('delivered_at')->update(['delivered_at' => now()]);

            foreach ($rows->take(30) as $r) {
                try { broadcast(new \App\Events\MessageUpdated((int) $r->conversation_id, 0, null, null, [], null, (int) $r->up_to))->toOthers(); } catch (\Throwable) {}
            }
        } catch (\Throwable) {}
    }

    private function reactionsOf(int $messageId): array
    {
        return DB::table('message_reactions')->where('message_id', $messageId)->get(['emoji', 'user_id'])
            ->map(fn ($r) => ['emoji' => $r->emoji, 'user_id' => (int) $r->user_id])->all();
    }

    /**
     * POST /api/conversations/{conversation}/report
     * Reports a user from within a conversation.
     * Attaches conversation_id so admin can load the full chat history.
     */
    public function reportConversation(Request $request, Conversation $conversation): JsonResponse
    {
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $other = $conversation->participants()
            ->where('user_id', '!=', Auth::id())
            ->first();

        if (!$other) {
            return response()->json(['message' => 'Could not identify reported user.'], 422);
        }

        if ($other->id === Auth::id()) {
            return response()->json(['message' => 'Cannot report yourself.'], 422);
        }

        // Prevent the same user spamming duplicate reports on the same conversation
        Report::upsertReport(
            reporterId: Auth::id(),
            reportedId: $other->id,
            reason: $validated['reason'],
            context: ['conversation_id' => $conversation->id]
        );

        return response()->json(['message' => 'Report submitted.']);

    }

    public function dismissRequest(Conversation $conversation): JsonResponse
    {
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        DB::table('conversation_request_dismissals')->updateOrInsert(
            ['user_id' => Auth::id(), 'conversation_id' => $conversation->id],
            ['dismissed_at' => now(), 'created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['ok' => true]);
    }

    private function ensureSupportConversation(User $user): void
    {
        $support = User::where('is_flockr_support', true)->first();
        if (!$support || $support->id === $user->id)
            return;

        $exists = $user->conversations()
            ->whereHas('participants', fn($q) => $q->where('user_id', $support->id))
            ->exists();

        if ($exists)
            return;

        $conv = Conversation::create();
        $conv->participants()->attach([$user->id, $support->id]);
        $conv->messages()->create([
            'sender_id' => $support->id,
            'body' => "Hi {$user->name}! 👋 I'm Chirp, Flockr's AI assistant. Ask me anything about your orders, payouts, or how Flockr works — or just say hi. You can also check if a seller is trustworthy by typing @ plus their name, or send me a photo of something you like and I'll find similar products for you.",
        ]);
    }


    public function markRead(Conversation $conversation): JsonResponse
    {
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $conversation->messages()->where('sender_id', '!=', Auth::id())->whereNull('read_at')->update(['read_at' => now(), 'delivered_at' => DB::raw('COALESCE(delivered_at, NOW())')]);
        return response()->json(['ok' => true]);
    }

    public function requestsPage(): Response
    {
        $user = Auth::user();
        $blockedIds = UserBlock::where('blocker_id', $user->id)->pluck('blocked_id')->toArray();
        $whoIFollow = DB::table('follows')->where('follower_id', $user->id)->pluck('following_id')->toArray();
        $dismissedIds = DB::table('conversation_request_dismissals')->where('user_id', $user->id)->pluck('conversation_id')->toArray();

        $convs = $user->conversations()
            ->with(['participants:' . self::PARTICIPANT_FIELDS . ',role,is_flockr_support,is_verified', 'lastMessage'])
            ->latest('updated_at')
            ->get();

        $convIds = $convs->pluck('id');
        $sentByMeIds = DB::table('messages')->where('sender_id', $user->id)->whereIn('conversation_id', $convIds)->distinct()->pluck('conversation_id')->toArray();
        $sentByOtherIds = DB::table('messages')->where('sender_id', '!=', $user->id)->whereIn('conversation_id', $convIds)->distinct()->pluck('conversation_id')->toArray();

        $requests = $convs->filter(function ($conv) use ($user, $whoIFollow, $sentByMeIds, $sentByOtherIds, $dismissedIds, $blockedIds) {
            $other = $conv->participants->first(fn($p) => $p->id !== $user->id);
            if (!$other || $other->is_flockr_support || in_array($other->id, $blockedIds))
                return false;
            return !in_array($other->id, $whoIFollow)
                && in_array($conv->id, $sentByOtherIds)
                && !in_array($conv->id, $sentByMeIds)
                && !in_array($conv->id, $dismissedIds);
        })
            ->map(fn($c) => tap($c, fn($cc) => $cc->setAttribute('other', $cc->participants->first(fn($p) => $p->id !== Auth::id()))))
            ->values();

        return Inertia::render('Inbox/Requests', ['requests' => $requests]);
    }


    /** Hide `last_seen_at` of the other participants unless they follow me, are support/admin, or have already replied. */
    private function hideStatus($conv, User $viewer): void
    {
        $others = $conv->participants->where('id', '!=', $viewer->id);
        if ($others->isEmpty()) return;
        $spoke     = DB::table('messages')->where('conversation_id', $conv->id)->where('sender_id', '!=', $viewer->id)->pluck('sender_id')->flip();
        $followers = DB::table('follows')->where('following_id', $viewer->id)->whereIn('follower_id', $others->pluck('id'))->pluck('follower_id')->flip();
        foreach ($others as $p) {
            if (!($p->is_flockr_support || $p->role === 'admin' || isset($followers[$p->id]) || isset($spoke[$p->id]))) $p->setAttribute('last_seen_at', null);
        }
    }

    private function hideSenderStatus(Conversation $conversation, $messages): void
    {
        $conversation->loadMissing('participants:' . self::PARTICIPANT_FIELDS . ',role,is_flockr_support');
        $this->hideStatus($conversation, Auth::user());
        $hidden = $conversation->participants->where('id', '!=', Auth::id())->filter(fn ($p) => $p->last_seen_at === null)->pluck('id')->all();
        foreach ($messages as $m) {
            if ($m->sender && in_array($m->sender->id, $hidden, true)) $m->sender->setAttribute('last_seen_at', null);
        }
    }
}
