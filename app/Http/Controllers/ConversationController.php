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

    public function index(): Response
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
        $sentByMeIds = DB::table('messages')->where('sender_id', $user->id)->whereIn('conversation_id', $convIds)->distinct()->pluck('conversation_id')->toArray();
        $sentByOtherIds = DB::table('messages')->where('sender_id', '!=', $user->id)->whereIn('conversation_id', $convIds)->distinct()->pluck('conversation_id')->toArray();

        $wallpaperIds = DB::table('conversation_user')->whereIn('conversation_id', $convIds)->whereNotNull('chat_wallpaper_id')->pluck('chat_wallpaper_id')->unique();
        $wallpapers = ChatWallpaper::whereIn('id', $wallpaperIds)->get()->keyBy('id');

        $mapped = $allConvs->map(function ($conv) use ($blockedIds, $blockedByIds, $whoFollowsMe, $whoIFollow, $sentByMeIds, $sentByOtherIds, $dismissedIds, $storage, $wallpapers, $user) {
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

            $other = $conv->participants->first(fn($p) => $p->id !== $user->id);
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
                'participants:' . self::PARTICIPANT_FIELDS,
                'lastMessage',
            ])
            ->withCount([
                'messages as unread_count' => function ($q) {
                    $q->whereNull('read_at')->where('sender_id', '!=', Auth::id());
                }
            ])
            ->first();

        if ($existing) {
            return response()->json($existing);
        }

        $conv = Conversation::create();
        $conv->participants()->attach([Auth::id(), $other->id]);

        return response()->json(
            $conv->load('participants:' . self::PARTICIPANT_FIELDS),
            201
        );
    }

    public function messages(Conversation $conversation): JsonResponse
    {
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $messages = $conversation->messages()
    ->with('sender:' . self::SENDER_FIELDS, 'replyTo:id,body,sender_id,media_type')
    ->orderBy('created_at', 'asc')
    ->get()
    ->map(function ($m) {
        if ($m->is_deleted) {
            $m->setAttribute('body', '');
            $m->setAttribute('media_url', null);
            return $m;
        }
        if ($m->media_path) {
            $m->setAttribute('media_url', app(StorageService::class)->url($m->media_path));
        }
        return $m;
    });

        $conversation->messages()
            ->where('sender_id', '!=', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
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

            if (!$theyFollowMe && !$otherParticipant->is_flockr_support) {
                $mySentCount = $conversation->messages()->where('sender_id', Auth::id())->count();
                if ($mySentCount >= 3) {
                    return response()->json([
                        'message' => "You've reached the message request limit. When @{$otherParticipant->username} follows you back, you'll be able to keep chatting.",
                        'request_limit_reached' => true,
                    ], 403);
                }
            }
        }

        $request->validate([
    'body'        => 'nullable|string|max:1000',
    'media'       => 'nullable|file|mimes:jpg,jpeg,png,webp,mp4,mov|max:20480',
    'reply_to_id' => 'nullable|integer|exists:messages,id',
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

        $message = $conversation->messages()->create([
    'sender_id'   => Auth::id(),
    'body'        => $bodyText,
    'media_path'  => $mediaPath,
    'media_type'  => $mediaType,
    'reply_to_id' => $request->input('reply_to_id'),
]);

        $message->load('sender:' . self::SENDER_FIELDS, 'replyTo:id,body,sender_id,media_type');
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
    if ($message->conversation_id !== $conversation->id) {
        return response()->json(['message' => 'Not found.'], 404);
    }
    if ($message->sender_id !== Auth::id()) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }

    $message->update(['is_deleted' => true]);
    $message->load('sender:' . self::SENDER_FIELDS, 'replyTo:id,body,sender_id');

    $masked = clone $message;
    $masked->setAttribute('body', '');
    $masked->setAttribute('media_url', null);

    try {
        broadcast(new \App\Events\MessageSent($masked, $conversation))->toOthers();
    } catch (\Throwable) {}

    return response()->json($masked);
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
            'body' => "Hi {$user->name}! 👋 I'm Flockr Support. Ask me anything about your orders, payouts, or how Flockr works — or just say hi. You can also check if a seller is trustworthy by typing @ plus their name right here in chat.",
        ]);
    }


    public function markRead(Conversation $conversation): JsonResponse
    {
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $conversation->messages()->where('sender_id', '!=', Auth::id())->whereNull('read_at')->update(['read_at' => now()]);
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

}