<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use App\Models\User;
use App\Models\UserBadge;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Admin v2 — badge catalog + manual award/revoke (event champions are still auto-awarded by the scheduler). */
class BadgeAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Badge::query()->withCount('users');
        if ($s = trim((string) $request->input('search'))) $q->where(fn ($w) => $w->where('label', 'ilike', "%$s%")->orWhere('key', 'ilike', "%$s%"));
        return response()->json(['rows' => $q->orderByDesc('id')->paginate(30)]);
    }

    public function holders($badgeId): JsonResponse
    {
        $badge = Badge::findOrFail($badgeId);
        $rows = $badge->users()->select('users.id', 'users.name', 'users.username', 'users.avatar')->orderByDesc('user_badges.awarded_at')->limit(100)->get();
        return response()->json(['badge' => $badge, 'holders' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $d = $request->validate(['label' => 'required|string|max:60', 'description' => 'nullable|string|max:200', 'image_path' => 'nullable|string|max:255']);
        $badge = Badge::create([
            'key' => 'custom_' . Str::slug($d['label'], '_') . '_' . Str::lower(Str::random(4)),
            'label' => $d['label'], 'description' => $d['description'] ?? '', 'image_path' => $d['image_path'] ?? 'badges/custom.png',
        ]);
        Audit::log('badge.create', $badge, ['label' => $badge->label]);
        return response()->json(['message' => 'Badge created.', 'badge' => $badge]);
    }

    public function update(Request $request, $badgeId): JsonResponse
    {
        $d = $request->validate(['label' => 'required|string|max:60', 'description' => 'nullable|string|max:200', 'image_path' => 'nullable|string|max:255']);
        $badge = Badge::findOrFail($badgeId);
        $badge->update(array_filter($d, fn ($v) => $v !== null));
        Audit::log('badge.update', $badge);
        return response()->json(['message' => 'Badge updated.']);
    }

    public function award(Request $request, $badgeId): JsonResponse
    {
        $d = $request->validate(['user_id' => 'required|integer|exists:users,id']);
        $badge = Badge::findOrFail($badgeId);
        UserBadge::firstOrCreate(['user_id' => $d['user_id'], 'badge_id' => $badge->id], ['awarded_at' => now()]);
        Audit::log('badge.award', $badge, ['user_id' => $d['user_id']]);
        return response()->json(['message' => 'Badge awarded.']);
    }

    public function revoke($badgeId, $userId): JsonResponse
    {
        $badge = Badge::findOrFail($badgeId);
        UserBadge::where('badge_id', $badge->id)->where('user_id', $userId)->delete();
        Audit::log('badge.revoke', $badge, ['user_id' => (int) $userId]);
        return response()->json(['message' => 'Badge revoked.']);
    }
}
