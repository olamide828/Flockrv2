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
        $trendingVideos = Video::where('status', 'active')
            ->whereNotNull('published_at')
            ->with('user:id,name,username,avatar')
            ->withCount(['likes', 'comments'])
            ->orderByDesc('views_count')
            ->limit(9)
            ->get()
            ->map(fn ($v) => array_merge($v->toArray(), [
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
        $limit    = min((int) $request->input('limit', 20), 50);

        if (strlen($q) < 1 && !$catId) {
            return response()->json(['products' => [], 'videos' => [], 'sellers' => []]);
        }

        // ── 1. Search Users / Sellers ─────────────────────────────────────────
        $sellers = collect();
        if (strlen($q) >= 1) {
            $sellers = User::where('is_active', true)
                ->where(function ($query) use ($q) {
                    // Strip @ if user typed @username
                    $cleanQ = ltrim($q, '@');
                    $query->where('username', 'ilike', "%{$cleanQ}%")
                          ->orWhere('name',     'ilike', "%{$q}%")
                          ->orWhere('bio',      'ilike', "%{$q}%");
                })
                ->select('id','name','username','avatar','bio','location','role','is_verified','followers_count')
                ->limit(10)
                ->get()
                ->map(fn ($u) => array_merge($u->toArray(), [
                    'avatar_url' => $u->avatar_url,
                ]));
        }

        // ── 2. Search Products ────────────────────────────────────────────────
        $productsQuery = Product::active()->inStock()
            ->with('seller:id,name,username,avatar,is_verified');

        if (strlen($q) >= 2) {
            $productsQuery->where(function ($query) use ($q) {
                $query->where('name',        'ilike', "%{$q}%")
                      ->orWhere('description','ilike', "%{$q}%")
                      ->orWhereJsonContains('tags', $q);
            });
        }

        if ($catId) {
            $productsQuery->where('category_id', $catId);
        }

        if ($priceMax) {
            $productsQuery->where('price', '<=', $priceMax);
        }

        $productsQuery = match ($sort) {
            'price_asc'  => $productsQuery->orderBy('price'),
            'price_desc' => $productsQuery->orderByDesc('price'),
            'newest'     => $productsQuery->latest(),
            default      => $productsQuery->orderByDesc('views_count'),
        };

        $products = $productsQuery->limit($limit)->get();

        // If we have Jina configured AND text query AND not enough results,
        // supplement with semantic search
        if (strlen($q) >= 3 && $products->count() < 5) {
            try {
                $semantic = $this->jina->searchProducts($q, $limit, array_filter([
                    'category_id' => $catId,
                    'price_max'   => $priceMax,
                ]));
                // Merge — deduplicate by id
                $existing = $products->pluck('id')->toArray();
                $extra    = $semantic->reject(fn ($p) => in_array($p->id, $existing));
                $products = $products->concat($extra)->take($limit);
            } catch (\Throwable) {
                // Jina not configured — plain SQL results are fine
            }
        }

        // ── 3. Search Videos ──────────────────────────────────────────────────
        $videos = collect();
        if (strlen($q) >= 2) {
            $videos = Video::where('status', 'active')
                ->whereNotNull('published_at')
                ->where(function ($query) use ($q) {
                    $query->where('title',       'ilike', "%{$q}%")
                          ->orWhere('description','ilike', "%{$q}%")
                          ->orWhere('captions',   'ilike', "%{$q}%");
                })
                ->with('user:id,name,username,avatar')
                ->withCount(['likes', 'comments'])
                ->orderByDesc('views_count')
                ->limit(9)
                ->get()
                ->map(fn ($v) => array_merge($v->toArray(), [
                    'thumbnail_url_full' => $v->thumbnail_url_full,
                ]));
        }

        return response()->json([
            'sellers'  => $sellers,
            'products' => $products->values(),
            'videos'   => $videos->values(),
        ]);
    }
}