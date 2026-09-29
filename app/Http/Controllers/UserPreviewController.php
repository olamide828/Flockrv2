<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserPreviewController extends Controller
{
    public function show(string $username): JsonResponse
    {
        $user = User::where('username', $username)->firstOrFail();
        $viewerId = Auth::id();

        $isFollowing = $viewerId && DB::table('follows')
            ->where('follower_id', $viewerId)->where('following_id', $user->id)->exists();

        $likesTotal = Video::where('user_id', $user->id)->sum('likes_count');

        $recentVideos = Video::active()
            ->where('user_id', $user->id)
            ->latest('published_at')
            ->limit(6)
            ->get(['ulid', 'thumbnail_url'])
            ->map(fn($v) => ['ulid' => $v->ulid, 'thumbnail_url' => $v->thumbnail_url_full]);

        return response()->json([
            'name'             => $user->name,
            'username'         => $user->username,
            'avatar_url'       => $user->avatar_url,
            'is_verified'      => $user->is_verified,
            'verification_type' => $user->verification_type,
            'bio'              => $user->bio,
            'followers_count'  => $user->followers_count,
            'following_count'  => $user->following_count,
            'likes_count'      => $likesTotal,
            'is_following'     => $isFollowing,
            'recent_videos'    => $recentVideos,
        ]);
    }
}