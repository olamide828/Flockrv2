<?php

namespace App\Http\Controllers;

use App\Models\OffPlatformWarning;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SafetyController extends Controller
{
    // Show the in-chat "seller asked to be paid outside Flockr" banner once
    // this many "continued" clicks have happened in THIS conversation.
    private const CONTINUE_BANNER_THRESHOLD = 2;

    // Flag a user's account for review once the warning sheet has been shown
    // this many times across ALL their conversations (any participant).
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
            'trigger_keyword' => 'nullable|string|max:100',
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
    public function sellerInfo(int $sellerId): JsonResponse
    {
        $user = User::select('id', 'name', 'username', 'avatar', 'is_verified', 'created_at')
            ->findOrFail($sellerId);

        return response()->json([
            'id'          => $user->id,
            'name'        => $user->name,
            'username'    => $user->username,
            'avatar_url'  => $user->avatar_url,
            'is_verified' => $user->is_verified,
            'joined_at'   => $user->created_at,
        ]);
    }
}