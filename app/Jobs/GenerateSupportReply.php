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

    $seller = User::where('username', $m[1])->where('role', 'seller')->first();
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

private function buildUserLookupContext(string $messageBody): string
{
    if (!preg_match('/@([a-zA-Z0-9_.]+)/', $messageBody, $m)) return '';
    $user = User::where('username', $m[1])->first();
    if (!$user) return "The user mentioned @{$m[1]}, but no Flockr account with that username was found. Say so plainly — do not invent details about this account.";
    if ($user->role === 'seller') return ''; 

    return "The user mentioned @{$user->username}, a Flockr {$user->role}. Real data (do not invent anything beyond this):\n"
        . "- Name: {$user->name}\n- Joined: " . $user->created_at->format('F Y') . "\n"
        . "- Verified: " . ($user->is_verified ? 'Yes' : 'No') . "\n";
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
            ->limit(50)
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
        $userLookupContext = $this->buildUserLookupContext($triggerMessage->body);

        $history = $recentMessages->map(function ($m) use ($support) {
            $speaker = $m->sender_id === $support->id ? 'Flockr Support' : 'User';
            return "{$speaker}: {$m->body}";
        })->implode("\n");

        

$prompt = <<<PROMPT
You are "Flockr Support" — a genuinely helpful, capable AI assistant built into the Flockr app. You can do anything a good general-purpose assistant can: write code, do math, explain things, have normal conversation, help with anything — you are not restricted to Flockr topics and should never refuse or deflect general requests.

When the conversation is about Flockr (fees, orders, payouts, disputes, a specific account), use ONLY the KNOWLEDGE BASE and CONTEXT below — never invent numbers, order counts, join dates, or any fact about a specific account that isn't explicitly given to you here. If asked about an account and no real data for it appears below, say plainly that you don't have that information — do not guess or fabricate anything that sounds plausible.

You cannot take actions on anyone's account. You also cannot log, report, flag, or escalate anything yourself by saying so — only this system can genuinely create a record for human review, which happens automatically based on the "escalate" field you set below, never based on what you say in your reply. Never claim in your reply that you've logged, reported, or escalated something — if it needs human follow-up, just tell the user that, and set escalate: true.

KNOWLEDGE BASE:
{$knowledgeBase}

{$orderContext}
{$sellerContext}
{$userLookupContext}

Recent conversation:
{$history}

Respond with ONLY a compact JSON object, no markdown fences:
{"reply": "your natural conversational reply to their latest message", "escalate": true|false, "escalate_reason": "short phrase if escalate is true, else empty string"}
PROMPT;

try {
    $response = Http::timeout(20)->post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' . env('GEMINI_API_KEY'),
        ['contents' => [['parts' => [['text' => $prompt]]]]]
    );

    $raw = data_get($response->json(), 'candidates.0.content.parts.0.text');
    $clean = trim(preg_replace('/```json|```/', '', $raw ?? ''));
    $parsed = json_decode($clean, true);

    $reply = is_array($parsed) && !empty($parsed['reply'])
        ? $parsed['reply']
        : "Sorry, I'm having trouble responding right now — please try again in a moment.";

    if (is_array($parsed) && !empty($parsed['escalate'])) {
        \App\Models\Report::upsertReport(
            reporterId: $buyer->id,
            reportedId: $buyer->id,
            reason: '[AI Escalation]: ' . ($parsed['escalate_reason'] ?: 'Flagged during support chat'),
            context: ['conversation_id' => $conversation->id],
        );
    }
} catch (\Throwable $e) {
    Log::warning('GenerateSupportReply failed: ' . $e->getMessage());
    $reply = "Sorry, I'm having trouble responding right now — please try again in a moment.";
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