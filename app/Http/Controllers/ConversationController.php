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
            ->with(['participants:id,name,username,avatar', 'lastMessage'])
            ->withCount(['messages as unread_count' => function ($q) {
                $q->where('read_at', null)->where('sender_id', '!=', Auth::id());
            }])
            ->latest('updated_at')
            ->get();

        return Inertia::render('Inbox/Index', ['conversations' => $conversations]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['user_id' => 'required|integer|exists:users,id']);
        $other     = User::findOrFail($validated['user_id']);

        // Find or create conversation
        $existing = Auth::user()->conversations()
            ->whereHas('participants', fn ($q) => $q->where('user_id', $other->id))
            ->first();

        if ($existing) return response()->json($existing->load('participants:id,name,username,avatar'));

        $conv = Conversation::create();
        $conv->participants()->attach([Auth::id(), $other->id]);

        return response()->json($conv->load('participants:id,name,username,avatar'), 201);
    }

    public function messages(Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $messages = $conversation->messages()
            ->with('sender:id,name,username,avatar')
            ->latest()
            ->paginate(50);

        // Mark as read
        $conversation->messages()
            ->where('sender_id', '!=', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);
        $validated = $request->validate(['body' => 'required|string|max:1000']);

        $message = $conversation->messages()->create([
            'sender_id' => Auth::id(),
            'body'      => $validated['body'],
        ]);

        $conversation->touch();

        // Broadcast via Reverb/Pusher
        broadcast(new \App\Events\MessageSent($message->load('sender:id,name,username,avatar'), $conversation))
            ->toOthers();

        return response()->json($message->load('sender:id,name,username,avatar'), 201);
    }
}
