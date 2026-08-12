<?php

namespace App\Jobs;

use App\Events\MessageSent;
use App\Events\NewMessageToast;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Order;
use App\Models\SupportDocument;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GenerateSupportReply implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 30;

    public function __construct(
        public int $conversationId,
        public int $triggerMessageId,
    ) {}

    public function handle(): void
    {
        $conversation = Conversation::find($this->conversationId);
        $triggerMessage = Message::find($this->triggerMessageId);
        if (!$conversation || !$triggerMessage) return;

        $support = User::where('is_flockr_support', true)->first();
        $buyer   = $conversation->participants()->where('user_id', '!=', $support->id)->first();
        if (!$support || !$buyer) return;

        // Last ~10 messages for conversational context.
        $recentMessages = $conversation->messages()
            ->with('sender:id,name')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->reverse()
            ->values();

        // Live, read-fresh-every-time knowledge base — see migration notes.
        $docs = SupportDocument::active()->get(['title', 'category', 'content']);
        $knowledgeBase = $docs->map(fn($d) => "### {$d->title}\n{$d->content}")->implode("\n\n");

        // Lightweight order-context detection — only pulls the buyer's own
        // data, and only when the message plausibly needs it.
        $orderContext = $this->buildOrderContext($buyer, $triggerMessage->body);

        $history = $recentMessages->map(function ($m) use ($support) {
            $speaker = $m->sender_id === $support->id ? 'Flockr Support' : 'User';
            return "{$speaker}: {$m->body}";
        })->implode("\n");

        $prompt = <<<PROMPT
You are "Flockr Support" — the official in-app assistant for Flockr, a Nigerian social-commerce marketplace app. You chat with users inside their normal Inbox, just like a real support agent would.

Personality: warm, concise, helpful. You are NOT limited to Flockr topics — if a user just wants to chat casually (say hi, ask something unrelated, vent, etc.), respond naturally like a normal friendly assistant. Only bring in Flockr-specific facts when the question is actually about Flockr.

When answering anything about how Flockr works (fees, payouts, orders, disputes, shipping, subscriptions, safety), use ONLY the facts in the KNOWLEDGE BASE below — it reflects Flockr's current, real, up-to-date policies. Never invent numbers, timelines, or policies not stated there. If the knowledge base doesn't cover something, say you're not sure and suggest they can wait for a human team member to follow up — do not guess.

You cannot take actions on the user's account (cannot cancel orders, issue refunds, or change settings) — you can only inform and, where relevant, tell the user exactly which button/page to use themselves (e.g. "you can cancel from your Orders page while it's still pending").

KNOWLEDGE BASE (always current — read fresh each time):
{$knowledgeBase}

{$orderContext}

Recent conversation:
{$history}

Reply to the user's latest message only. Keep it conversational and reasonably short — this is a chat, not an essay. Do not prefix your reply with "Flockr Support:" or any label, just write the message itself.
PROMPT;

        try {
            $response = Http::timeout(20)->post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' . env('GEMINI_API_KEY'),
                ['contents' => [['parts' => [['text' => $prompt]]]]]
            );

            $reply = data_get($response->json(), 'candidates.0.content.parts.0.text');
            $reply = $reply ? trim($reply) : "Sorry, I'm having trouble responding right now — please try again in a moment, or a human team member will follow up here.";
        } catch (\Throwable $e) {
            Log::warning('GenerateSupportReply failed: ' . $e->getMessage());
            $reply = "Sorry, I'm having trouble responding right now — please try again in a moment, or a human team member will follow up here.";
        }

        $message = $conversation->messages()->create([
            'sender_id' => $support->id,
            'body'      => $reply,
        ]);
        $message->load('sender:id,name,username,avatar,last_seen_at');
        $conversation->touch();

        try {
            broadcast(new MessageSent($message, $conversation))->toOthers();
            broadcast(new NewMessageToast($message, $buyer, $conversation->id));
        } catch (\Throwable) {}
    }

    /**
     * Pulls the buyer's OWN recent orders/payouts only when their message
     * plausibly references one — keeps every other message cheap (no DB
     * scan) and never exposes any other user's data.
     */
    private function buildOrderContext(User $buyer, string $messageBody): string
    {
        $lower = strtolower($messageBody);
        $mentionsOrder = str_contains($lower, 'order')
            || preg_match('/flk[-_]?\w+/i', $messageBody)
            || str_contains($lower, 'payout')
            || str_contains($lower, 'wallet')
            || str_contains($lower, 'balance')
            || str_contains($lower, 'refund')
            || str_contains($lower, 'deliver');

        if (!$mentionsOrder) return '';

        $orders = Order::where('buyer_id', $buyer->id)
            ->orWhere('seller_id', $buyer->id)
            ->latest()
            ->limit(5)
            ->get(['reference', 'status', 'total', 'created_at', 'paid_at', 'shipped_at', 'delivered_at', 'buyer_id', 'seller_id']);

        if ($orders->isEmpty()) return '';

        $lines = $orders->map(function ($o) use ($buyer) {
            $role = $o->buyer_id === $buyer->id ? 'purchase' : 'sale';
            return "- {$o->reference} ({$role}): status={$o->status}, total=₦" . number_format($o->total, 2) . ", created={$o->created_at->toDateString()}";
        })->implode("\n");

        $balance = $buyer->wallet_balance;

        return "This user's own recent orders (only reference these if relevant to their question — never mention other users' data):\n{$lines}\nTheir current wallet balance: ₦" . number_format($balance, 2);
    }
}