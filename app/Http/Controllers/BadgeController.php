<?php
namespace App\Http\Controllers;

use App\Models\UserBadge;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class BadgeController extends Controller
{
    public function newBadges(): JsonResponse
    {
        $unseen = UserBadge::where('user_id', Auth::id())
            ->whereNull('seen_at')
            ->with('badge:id,key,label,description,image_path')
            ->get();

        if ($unseen->isEmpty()) {
            return response()->json([]);
        }

        UserBadge::where('user_id', Auth::id())
            ->whereIn('id', $unseen->pluck('id'))
            ->update(['seen_at' => now()]);

        return response()->json($unseen->pluck('badge')->values());
    }

  public function roadmap(): JsonResponse
{
    $user = Auth::user();

    // Show seller badges only to sellers (buyers can't earn them at all),
    // but ALWAYS show buyer badges to everyone — a seller can still buy.
    $audiences = $user->role === 'seller' ? ['seller', 'buyer', 'both'] : ['buyer', 'both'];

    $earnedIds = UserBadge::where('user_id', $user->id)->pluck('badge_id')->toArray();

    $badges = \App\Models\Badge::whereIn('audience', $audiences)->get();
    $progressService = app(\App\Services\BadgeProgressService::class);

    return response()->json(
        $badges->map(function ($badge) use ($earnedIds, $user, $progressService) {
            $earned = in_array($badge->id, $earnedIds);
            $current = ($earned || !$badge->progress_metric)
                ? $badge->progress_target
                : $progressService->currentValue($user, $badge->progress_metric);

            return [
                'key'                => $badge->key,
                'label'              => $badge->label,
                'description'        => $badge->description,
                'requirement_label'  => $badge->requirement_label,
                'image_path'         => $badge->image_path,
                'earned'             => $earned,
                'progress_current'   => $badge->progress_target ? min($current, $badge->progress_target) : null,
                'progress_target'    => $badge->progress_target,
            ];
        })->sortByDesc('earned')->values()
    );
}

}