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
}