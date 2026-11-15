<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeedAdminController extends Controller
{
    public function settings(): JsonResponse
    {
        return response()->json([
            'shop_ratio' => (float) AppSetting::get('feed.shop_ratio', 0.30),
            'stats' => [
                'videos_total'    => DB::table('videos')->whereNull('deleted_at')->count(),
                'shopping_videos' => DB::table('videos')->whereNull('deleted_at')->where('content_type', 'shopping')->count(),
                'fun_videos'      => DB::table('videos')->whereNull('deleted_at')->where('content_type', 'entertainment')->count(),
                'hauls'           => DB::table('videos')->whereNull('deleted_at')->where('content_type', 'haul')->count(),
                'reviews'         => DB::table('videos')->whereNull('deleted_at')->where('content_type', 'review')->count(),
            ],
        ]);
    }

    public function save(Request $request): JsonResponse
    {
        $data = $request->validate(['shop_ratio' => 'required|numeric|min:0|max:0.5']);
        $old  = AppSetting::get('feed.shop_ratio', 0.30);
        AppSetting::set('feed.shop_ratio', round((float) $data['shop_ratio'], 2));
        Audit::log('feed.shop_ratio', null, ['from' => $old, 'to' => $data['shop_ratio']]);
        return response()->json(['message' => 'Feed mix updated.']);
    }

    public function hashtags(Request $request): JsonResponse
    {
        $q = DB::table('hashtags');
        if ($s = trim((string) $request->input('search'))) $q->where('tag', 'ilike', "%{$s}%");
        return response()->json(['rows' => $q->orderByDesc(DB::raw('videos_count + products_count'))->limit(60)->get()]);
    }
}
