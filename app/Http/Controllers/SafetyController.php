<?php

namespace App\Http\Controllers;

use App\Models\OffPlatformWarning;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SafetyController extends Controller
{
    private const CONTINUE_BANNER_THRESHOLD = 2;
    private const SELLER_FLAG_THRESHOLD = 5;

    private function assertParticipant(int $conversationId): void
    {
        $isParticipant = DB::table('conversation_user')
            ->where('conversation_id', $conversationId)
            ->where('user_id', Auth::id())
            ->exists();

        abort_unless($isParticipant, 403, 'Not a participant in this conversation.');
    }

    /** POST /api/safety/off-platform-warning */
    public function recordWarning(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'conversation_id' => 'required|integer|exists:conversations,id',
            'seller_id'       => 'required|integer|exists:users,id',
            'action'          => 'required|in:shown,continued,paid_flockr',
            'trigger_keyword' => 'nullable|string|max:150',
        ]);

        $this->assertParticipant($validated['conversation_id']);

        OffPlatformWarning::create([
            'conversation_id' => $validated['conversation_id'],
            'buyer_id'        => Auth::id(),
            'seller_id'       => $validated['seller_id'],
            'action'          => $validated['action'],
            'trigger_keyword' => $validated['trigger_keyword'] ?? null,
        ]);

        $continuedCount = OffPlatformWarning::where('conversation_id', $validated['conversation_id'])
            ->where('action', 'continued')
            ->count();

        if ($validated['action'] === 'shown') {
            $shownCount = OffPlatformWarning::where('seller_id', $validated['seller_id'])
                ->where('action', 'shown')
                ->count();

            if ($shownCount >= self::SELLER_FLAG_THRESHOLD) {
                $user = User::find($validated['seller_id']);
                if ($user && !$user->is_flagged_for_review) {
                    $user->update(['is_flagged_for_review' => true, 'flagged_at' => now()]);
                    Log::warning("User #{$user->id} flagged for review — {$shownCount} off-platform payment warnings triggered.");
                }
            }
        }

        return response()->json([
            'continued_count' => $continuedCount,
            'show_banner'     => $continuedCount >= self::CONTINUE_BANNER_THRESHOLD,
        ]);
    }

    /** GET /api/safety/conversations/{conversation}/status */
    public function conversationStatus(int $conversationId): JsonResponse
    {
        $this->assertParticipant($conversationId);

        $continuedCount = OffPlatformWarning::where('conversation_id', $conversationId)
            ->where('action', 'continued')
            ->count();

        return response()->json([
            'continued_count' => $continuedCount,
            'show_banner'     => $continuedCount >= self::CONTINUE_BANNER_THRESHOLD,
        ]);
    }

    /** GET /api/safety/seller-info/{seller} */
    public function sellerInfo(int $seller): JsonResponse
    {
        $user = User::select('id', 'name', 'username', 'avatar', 'is_verified', 'created_at')
            ->findOrFail($seller);

        return response()->json([
            'id'          => $user->id,
            'name'        => $user->name,
            'username'    => $user->username,
            'avatar_url'  => $user->avatar_url,
            'is_verified' => $user->is_verified,
            'joined_at'   => $user->created_at,
        ]);
    }

    /**
     * POST /api/safety/classify-message
     *
     * Second-layer detection for off-platform payment solicitation that the
     * keyword list doesn't literally match — obfuscated spelling, indirect
     * phrasing, etc. Only called by the frontend when a message contains a
     * "soft signal" (payment-adjacent words or a long digit run) but missed
     * the keyword regex, so this stays cheap — most ordinary chat messages
     * never reach this endpoint at all.
     */
    public function classifyMessage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $text = trim($validated['message']);
        if ($text === '') {
            return response()->json(['is_risky' => false, 'confidence' => 0]);
        }

        $prompt = <<<PROMPT
You are a safety classifier for an e-commerce chat app called Flockr. Buyers and sellers message each other about products. Flockr takes a small platform fee on in-app payments, so some bad actors try to convince the other party to pay outside the app (bank transfer, WhatsApp, cash, crypto, gift cards, etc.) to avoid the fee or to scam them.

Decide whether the message below is trying to arrange or solicit payment OUTSIDE the Flockr app / checkout. This includes: asking for or sharing bank account details, asking to move to WhatsApp/Instagram/phone specifically to arrange payment, asking for cash/crypto/gift-card payment, or explicitly suggesting avoiding Flockr's fee. Ordinary chat about the product, price negotiation within the app, or general conversation is NOT risky.

Respond with ONLY a compact JSON object, no markdown, no explanation:
{"is_risky": true|false, "confidence": 0.0-1.0, "reason": "short phrase, max 6 words"}

Message: "{$text}"
PROMPT;

        try {
            $response = Http::timeout(8)->post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' . env('GEMINI_API_KEY'),
                ['contents' => [['parts' => [['text' => $prompt]]]]]
            );

            $content = data_get($response->json(), 'candidates.0.content.parts.0.text');
            if (!$content) {
                return response()->json(['is_risky' => false, 'confidence' => 0]);
            }

            $clean = trim(preg_replace('/```json|```/', '', $content));
            $parsed = json_decode($clean, true);

            if (!is_array($parsed) || !array_key_exists('is_risky', $parsed)) {
                return response()->json(['is_risky' => false, 'confidence' => 0]);
            }

            return response()->json([
                'is_risky'   => (bool) $parsed['is_risky'],
                'confidence' => (float) ($parsed['confidence'] ?? 0),
                'reason'     => $parsed['reason'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Off-platform AI classification failed: ' . $e->getMessage());
            return response()->json(['is_risky' => false, 'confidence' => 0]);
        }
    }
}