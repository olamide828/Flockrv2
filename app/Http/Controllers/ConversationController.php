<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Report;
use App\Models\User;
use App\Models\UserBlock;
use App\Events\NewMessageToast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ConversationController extends Controller
{
    private const PARTICIPANT_FIELDS = 'id,name,username,avatar,last_seen_at';
    private const SENDER_FIELDS      = 'id,name,username,avatar,last_seen_at';

   public function index(): Response
    {
        $user = Auth::user();

        $this->ensureSupportConversation($user);

        $blockedIds   = UserBlock::where('blocker_id', $user->id)->pluck('blocked_id')->toArray();
        $blockedByIds = UserBlock::where('blocked_id', $user->id)->pluck('blocker_id')->toArray();

        // Query relationships ONCE outside the loop to prevent N+1 queries
        $whoFollowsMe = DB::table('follows')->where('following_id', $user->id)->pluck('follower_id')->toArray();
        $whoIFollow   = DB::table('follows')->where('follower_id', $user->id)->pluck('following_id')->toArray();
        $dismissedIds = DB::table('conversation_request_dismissals')
            ->where('user_id', $user->id)
            ->pluck('conversation_id')
            ->toArray();

        $conversations = $user
            ->conversations()
            ->with([
                'participants:' . self::PARTICIPANT_FIELDS . ',role,is_flockr_support',
                'lastMessage.sender:' . self::SENDER_FIELDS,
            ])
            ->withCount(['messages as unread_count' => function ($q) {
                $q->whereNull('read_at')->where('sender_id', '!=', Auth::id());
            }])
            ->latest('updated_at')
            ->get()
            // ADDED $dismissedIds TO THE use() LIST BELOW
            ->map(function ($conv) use ($blockedIds, $blockedByIds, $whoFollowsMe, $whoIFollow, $dismissedIds) {
                $conv->participants->each(function ($p) use ($blockedIds, $blockedByIds, $whoFollowsMe, $whoIFollow) {
                    $p->setAttribute('is_blocked_by_me', in_array($p->id, $blockedIds));
                    $p->setAttribute('has_blocked_me',   in_array($p->id, $blockedByIds));
                    $p->setAttribute('follows_me',       in_array($p->id, $whoFollowsMe));
                    $p->setAttribute('i_follow_them',   in_array($p->id, $whoIFollow));
                });

                // Set on the conversation itself (OUTSIDE the participants loop)
                $conv->setAttribute('request_dismissed', in_array($conv->id, $dismissedIds));

                $conv->setAttribute(
                    'is_support',
                    $conv->participants->contains(fn($p) => $p->is_flockr_support)
                );
                return $conv;
            })
            // Support conversation always first, everything else by recency.
            ->sortByDesc(fn($c) => $c->is_support ? 1 : 0)
            ->values();

        return Inertia::render('Inbox/Index', [
            'conversations'     => $conversations,
            'blockedByMeIds'    => $blockedIds,
            'blockedByOtherIds' => $blockedByIds,
        ]);
    }



    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['user_id' => 'required|integer|exists:users,id']);
        $other     = User::findOrFail($validated['user_id']);

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
            ->withCount(['messages as unread_count' => function ($q) {
                $q->whereNull('read_at')->where('sender_id', '!=', Auth::id());
            }])
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
            ->with('sender:' . self::SENDER_FIELDS)
            ->orderBy('created_at', 'asc')
            ->get();

        $conversation->messages()
            ->where('sender_id', '!=', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    // Replace the existing sendMessage() method with this — only the block after
// broadcast(new MessageSent(...)) is new; everything above it is unchanged
// from your file:
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

    $validated = $request->validate(['body' => 'required|string|max:1000']);

    $message = $conversation->messages()->create([
        'sender_id' => Auth::id(),
        'body'      => $validated['body'],
    ]);

    $message->load('sender:' . self::SENDER_FIELDS);
    $conversation->touch();

    try {
        broadcast(new \App\Events\MessageSent($message, $conversation))->toOthers();
    } catch (\Throwable) {}

    // Global "WhatsApp-style" toast for the recipient — separate from the
    // conversation-channel MessageSent broadcast above, which only reaches
    // someone actively viewing Inbox.jsx. This reaches them anywhere in the app.
    if ($otherParticipant) {
        try {
            broadcast(new NewMessageToast($message, $otherParticipant, $conversation->id));
        } catch (\Throwable) {}
    }

    // If the recipient is the Flockr Support system account, queue an AI
    // reply. Queued (not inline) so the buyer's own message send stays fast —
    // the bot's reply arrives a moment later via the same broadcast pipeline,
    // same as a real support agent typing back.
    if ($otherParticipant && $otherParticipant->is_flockr_support) {
        \App\Jobs\GenerateSupportReply::dispatch($conversation->id, $message->id);
    }

    return response()->json($message, 201);
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
    reason:     $validated['reason'],
    context:    ['conversation_id' => $conversation->id]
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
    if (!$support || $support->id === $user->id) return;

    $exists = $user->conversations()
        ->whereHas('participants', fn($q) => $q->where('user_id', $support->id))
        ->exists();

    if ($exists) return;

    $conv = Conversation::create();
    $conv->participants()->attach([$user->id, $support->id]);
    $conv->messages()->create([
    'sender_id' => $support->id,
    'body'      => "Hi {$user->name}! 👋 I'm Flockr Support. Ask me anything about your orders, payouts, or how Flockr works — or just say hi. You can also check if a seller is trustworthy by typing @ plus their name right here in chat.",
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

}