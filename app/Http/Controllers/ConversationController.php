<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ConversationController extends Controller
{
    public function index(): Response
    {
        $conversations = Auth::user()
            ->conversations()
            ->with([
                'participants:id,name,username,avatar',
                'lastMessage.sender:id,name,username',
            ])
            ->withCount(['messages as unread_count' => function ($q) {
                $q->whereNull('read_at')->where('sender_id', '!=', Auth::id());
            }])
            ->latest('updated_at')
            ->get();

        return Inertia::render('Inbox/Index', [
            'conversations' => $conversations,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['user_id' => 'required|integer|exists:users,id']);
        $other     = User::findOrFail($validated['user_id']);

        // Prevent messaging yourself
        if ($other->id === Auth::id()) {
            return response()->json(['message' => 'Cannot message yourself.'], 422);
        }

        // Find existing conversation between these two users
        $existing = Auth::user()
            ->conversations()
            ->whereHas('participants', fn ($q) => $q->where('user_id', $other->id))
            ->with([
                'participants:id,name,username,avatar',
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
            $conv->load('participants:id,name,username,avatar'),
            201
        );
    }

    public function messages(Conversation $conversation): JsonResponse
    {
        // Manual auth check instead of Policy
        if (!$conversation->participants()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Return oldest-first (ascending) so frontend can append naturally
        $messages = $conversation->messages()
            ->with('sender:id,name,username,avatar')
            ->orderBy('created_at', 'asc')   // ← oldest first, no need to reverse
            ->get();

        // Mark received messages as read
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

        $validated = $request->validate(['body' => 'required|string|max:1000']);

        $message = $conversation->messages()->create([
            'sender_id' => Auth::id(),
            'body'      => $validated['body'],
        ]);

        $message->load('sender:id,name,username,avatar');
        $conversation->touch();

        // Broadcast via Reverb/Pusher (safe — won't crash if not configured)
        try {
            broadcast(new \App\Events\MessageSent($message, $conversation))->toOthers();
        } catch (\Throwable) {}

        return response()->json($message, 201);
    }
}