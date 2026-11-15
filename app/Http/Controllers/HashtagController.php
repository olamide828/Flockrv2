<?php

namespace App\Http\Controllers;

use App\Services\HashtagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HashtagController extends Controller
{
    /** GET /api/hashtags/suggest?q=th&type=videos|products  → [{tag,count}] (empty q = trending) */
    public function suggest(Request $request, HashtagService $svc): JsonResponse
    {
        $type = in_array($request->input('type'), ['videos', 'products']) ? $request->input('type') : 'all';
        return response()->json(['tags' => $svc->suggest((string) $request->input('q', ''), $type, 8)]);
    }
}
