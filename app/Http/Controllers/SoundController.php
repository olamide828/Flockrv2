<?php

namespace App\Http\Controllers;

use App\Models\Sound;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SoundController extends Controller
{
    private const PAGE = 30;

    /**
     * GET /api/sounds?tab=library|creators&q=...&offset=0
     * library  = licensed tracks you import with `php artisan sounds:import`
     * creators = original sounds extracted from videos whose creator allowed reuse
     */
    public function index(Request $request): JsonResponse
    {
        $source = $request->query('tab') === 'creators' ? 'original' : 'library';
        $q      = trim((string) $request->query('q', ''));
        $offset = max(0, (int) $request->query('offset', 0));

        $rows = Sound::active()
            ->where('source', $source)
            ->when($q !== '', function ($query) use ($q) {
                $like = '%' . addcslashes($q, '\\%_') . '%';
                $query->where(fn ($w) => $w->where('title', 'ilike', $like)->orWhere('artist', 'ilike', $like));
            })
            ->orderByDesc('uses_count')
            ->orderByDesc('id')
            ->offset($offset)
            ->limit(self::PAGE + 1)
            ->get();

        return response()->json([
            'data'     => $rows->take(self::PAGE)->map->toApi()->values(),
            'has_more' => $rows->count() > self::PAGE,
        ]);
    }
}
