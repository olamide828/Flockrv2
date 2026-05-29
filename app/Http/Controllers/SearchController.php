<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use App\Models\Video;
use App\Services\JinaService;
use App\Services\OpenAIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function __construct(
        private readonly JinaService   $jina,
        private readonly OpenAIService $openai,
    ) {}

     public function index(Request $request): Response
    {
        $trendingVideos = Video::active()
            ->with('user:id,name,username,avatar')
            ->withCount(['likes', 'comments'])
            ->orderByDesc('views_count')
            ->limit(9)
            ->get()
            ->map(fn ($v) => array_merge($v->toArray(), [
                'video_stream_url'   => $v->video_stream_url,
                'thumbnail_url_full' => $v->thumbnail_url_full,
            ]));
 
        $trendingProducts = Product::active()->inStock()
            ->with('seller:id,name,username,avatar,is_verified')
            ->withCount('orderItems')
            ->orderByDesc('order_items_count')
            ->limit(12)
            ->get();
 
        return Inertia::render('Explore/Index', [
            'trendingVideos'   => $trendingVideos,
            'trendingProducts' => $trendingProducts,
        ]);
    }

    /**
     * GET /api/search
     *
     * Searches across:
     *  1. Users/Sellers  — by name, username, bio
     *  2. Products       — by name, description (+ Jina semantic if configured)
     *  3. Videos         — by title, description, hashtags
     *
     * All three are searched with a plain ILIKE query as the primary driver.
     * Jina embeddings are used as a bonus if they're configured.
     */
     public function search(Request $request): JsonResponse
    {
        $q        = trim($request->input('q', ''));
        $catId    = $request->input('category_id');
        $priceMax = $request->filled('price_max') ? (float) $request->price_max : null;
        $sort     = $request->input('sort', 'relevance');
        $limit    = min((int) $request->input('limit', 24), 50);
 
        // Require at least 1 character OR a category filter
        if (strlen($q) < 1 && !$catId) {
            return response()->json(['products' => [], 'sellers' => [], 'videos' => [], 'related' => []]);
        }
 
        // ── Users / sellers ───────────────────────────────────────────────────
        $sellers = collect();
        if (strlen($q) >= 1) {
            $cleanQ  = ltrim($q, '@');
            $sellers = User::where('is_active', true)
                ->where(function ($query) use ($cleanQ, $q) {
                    $query->where('username', 'ilike', "%{$cleanQ}%")
                          ->orWhere('name',     'ilike', "%{$q}%")
                          ->orWhere('bio',      'ilike', "%{$q}%");
                })
                ->select('id','name','username','avatar','bio','location','role','is_verified','followers_count')
                ->limit(8)
                ->get()
                ->map(fn ($u) => array_merge($u->toArray(), ['avatar_url' => $u->avatar_url]));
        }
 
        // ── Products ──────────────────────────────────────────────────────────
        $productsQuery = Product::active()->inStock()
            ->with('seller:id,name,username,avatar,is_verified');
 
        if (strlen($q) >= 1) {
            $productsQuery->where(function ($query) use ($q) {
                $query->where('name',        'ilike', "%{$q}%")
                      ->orWhere('description','ilike', "%{$q}%")
                      ->orWhereRaw("tags::text ilike ?", ["%{$q}%"]);
            });
        }
 
        if ($catId) $productsQuery->where('category_id', $catId);
        if ($priceMax) $productsQuery->where('price', '<=', $priceMax);
 
        $productsQuery = match ($sort) {
            'price_asc'  => $productsQuery->orderBy('price'),
            'price_desc' => $productsQuery->orderByDesc('price'),
            'newest'     => $productsQuery->latest(),
            'popular'    => $productsQuery->orderByDesc('views_count'),
            default      => $productsQuery->orderByDesc('views_count'),
        };
 
        $products = $productsQuery->limit($limit)->get();
 
        // ── Videos ───────────────────────────────────────────────────────────
        $videos = collect();
        if (strlen($q) >= 1) {
            $videos = Video::active()
                ->where(function ($query) use ($q) {
                    $query->where('title',       'ilike', "%{$q}%")
                          ->orWhere('description','ilike', "%{$q}%")
                          ->orWhereRaw("hashtags::text ilike ?", ["%{$q}%"]);
                })
                ->with('user:id,name,username,avatar')
                ->withCount(['likes', 'comments'])
                ->orderByDesc('views_count')
                ->limit(9)
                ->get()
                ->map(fn ($v) => array_merge($v->toArray(), [
                    'thumbnail_url_full' => $v->thumbnail_url_full,
                    'video_stream_url'   => $v->video_stream_url,
                ]));
        }
 
        $hasResults = $products->isNotEmpty() || $sellers->isNotEmpty() || $videos->isNotEmpty();
 
        // ── Related (shown when no direct results) ────────────────────────────
        // Pull trending products from the same or adjacent categories
        $related = collect();
        if (!$hasResults && strlen($q) >= 1) {
            $related = Product::active()->inStock()
                ->with('seller:id,name,username,avatar,is_verified')
                ->orderByDesc('views_count')
                ->limit(6)
                ->get();
        }
 
        return response()->json([
            'sellers'  => $sellers->values(),
            'products' => $products->values(),
            'videos'   => $videos->values(),
            'related'  => $related->values(),
        ]);
    }
}
