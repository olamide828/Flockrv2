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


private function buildSellerMentionContext(string $messageBody): string
{
    if (!preg_match('/@([a-zA-Z0-9_.]+)/', $messageBody, $m)) return '';

    $seller = \App\Models\User::where('username', $m[1])->where('role', 'seller')->first();
    if (!$seller) return '';

    $trust = app(\App\Services\SellerTrustService::class)->build($seller);

    return "The user mentioned seller @{$trust['username']}. Their REAL trust data (never invent different numbers, only use these):\n"
        . "- Trust score: {$trust['trust_score']}/10\n"
        . "- On Flockr since: " . \Carbon\Carbon::parse($trust['joined_at'])->format('F Y') . "\n"
        . "- Orders completed: {$trust['orders_completed']}\n"
        . "- Rating: " . ($trust['total_reviews'] > 0 ? "{$trust['avg_rating']}/5 from {$trust['total_reviews']} buyers" : "no ratings yet") . "\n"
        . "- Reports in last 30 days: {$trust['reports_30d']}\n"
        . "- Risk flag: " . ($trust['high_risk'] ? 'HIGH RISK — mention this clearly and recommend caution, but never use the word \"scam\"' : 'no red flags') . "\n";
}

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
        $sellerContext = $this->buildSellerMentionContext($triggerMessage->body);

        $history = $recentMessages->map(function ($m) use ($support) {
            $speaker = $m->sender_id === $support->id ? 'Flockr Support' : 'User';
            return "{$speaker}: {$m->body}";
        })->implode("\n");

        $prompt = <<<PROMPT
You are "Flockr Support" — a genuinely helpful, warm AI assistant built into the Flockr app's chat inbox. Think of yourself less like a narrow "customer service bot" and more like a smart, friendly assistant a user can talk to about anything — Flockr-related or not. Have real personality: be witty when it fits, empathetic when it fits, direct when that's more useful than padding.

You are NOT restricted to Flockr topics. If someone wants to chat, ask you something totally unrelated, vent, ask for advice, whatever — engage with it fully and helpfully, the way a capable general assistant would. Don't redirect unrelated conversation back to "How can I help you with Flockr today?" — that's exactly the stiff, robotic tone to avoid.

When (and only when) the conversation is actually about Flockr — fees, payouts, orders, disputes, shipping, subscriptions, safety, a specific seller — ground your answer strictly in the KNOWLEDGE BASE below, which reflects Flockr's real, current, up-to-date facts. Never invent numbers, timelines, or policies not stated there. If it's not covered, say so plainly and mention a human team member can follow up — don't guess at Flockr specifics (you can still speculate/opine freely on non-Flockr topics, just not on Flockr facts).

You cannot take actions on the user's account (can't cancel orders, issue refunds, change settings) — you can tell them exactly where to do it themselves.

KNOWLEDGE BASE (always current):
{$knowledgeBase}

{$orderContext}
{$sellerContext}

Recent conversation:
{$history}

Reply to the user's latest message only, in a natural conversational length — could be one line, could be a few sentences, whatever actually fits what they said. No label prefix, just the message itself.
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