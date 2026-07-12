<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use App\Models\Video;
use App\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SearchController
 *
 * Jina/OpenAI removed — neither has network access in dev and
 * no embedding columns exist in the DB yet.
 * All search is keyword-based (ILIKE). Trending uses velocity scoring.
 *
 * When you add embedding columns later, you can re-inject JinaService
 * and swap searchProducts() / searchVideos() to use semantic search.
 */
class SearchController extends Controller
{
    public function __construct(
        private readonly FeedService $feedService,
    ) {}

    // ── Inertia page ──────────────────────────────────────────────────────────

    public function index(): Response
    {
        return Inertia::render('Explore/Index', [
            'trendingVideos'   => $this->getTrendingVideos(),
            'trendingProducts' => $this->getPopularProducts(),
        ]);
    }

    // ── API ───────────────────────────────────────────────────────────────────

    public function search(Request $request): JsonResponse
    {
        $q        = trim($request->input('q', ''));
        $catId    = $request->input('category_id');
        $priceMax = $request->filled('price_max') ? (float) $request->price_max : null;
        $sort     = $request->input('sort', 'relevance');
        $limit    = min((int) $request->input('limit', 24), 50);

        if (strlen($q) < 1 && !$catId) {
            return response()->json(['products' => [], 'videos' => [], 'sellers' => [], 'related' => []]);
        }

        // ── Sellers ───────────────────────────────────────────────────────────
        $sellers = collect();
        if (strlen($q) >= 1) {
            $cleanQ  = ltrim($q, '@');
            $sellers = User::where(function ($query) use ($cleanQ, $q) {
                    $query->where('name',     'ilike', "%{$q}%")
                          ->orWhere('username','ilike', "%{$cleanQ}%")
                          ->orWhere('bio',     'ilike', "%{$q}%");
                })
                ->where('role',      '!=', 'admin')
                ->where('is_active', true)
                ->select(['id','name','username','avatar','bio','role','is_verified','followers_count','location'])
                ->limit(8)
                ->get()
                ->map(fn ($u) => array_merge($u->toArray(), ['avatar_url' => $u->avatar_url]));
        }

        // ── Products ──────────────────────────────────────────────────────────
        $products = $this->searchProducts($q, $limit, [
            'category_id' => $catId,
            'price_max'   => $priceMax,
            'condition'   => $request->input('condition'),
            'sort'        => $sort,
        ]);

        // ── Videos ────────────────────────────────────────────────────────────
        $videos = $this->searchVideos($q);

        $hasResults = $products->isNotEmpty() || $sellers->isNotEmpty() || $videos->isNotEmpty();

        // Related fallback — show trending when nothing found
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

    // ── Search helpers ────────────────────────────────────────────────────────

    private function searchProducts(string $q, int $limit, array $filters): \Illuminate\Support\Collection
    {
        $query = Product::active()->inStock()
            ->with('seller:id,name,username,avatar,is_verified');

        if (strlen($q) >= 1) {
            $query->where(function ($qb) use ($q) {
                $qb->where('name',        'ilike', "%{$q}%")
                   ->orWhere('description','ilike', "%{$q}%");
            });
        }

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }
        if (!empty($filters['price_max'])) {
            $query->where('price', '<=', $filters['price_max']);
        }
        if (!empty($filters['condition'])) {
            $query->where('condition', $filters['condition']);
        }

        $query = match ($filters['sort'] ?? 'relevance') {
            'price_asc'  => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'newest'     => $query->latest(),
            'popular'    => $query->orderByDesc('orders_count'),
            default      => $query->orderByDesc('views_count'),
        };

        $products = $query->limit($limit)->get();

    // ── Stamp is_saved ────────────────────────────────────────────────────
    $userId = Auth::id();
    if ($userId && $products->isNotEmpty()) {
        $savedIds = \DB::table('product_saves')
            ->where('user_id', $userId)
            ->whereIn('product_id', $products->pluck('id')->toArray())
            ->pluck('product_id')
            ->flip()
            ->toArray();

        $products->each(fn($p) => $p->is_saved = isset($savedIds[$p->id]));
    } else {
        $products->each(fn($p) => $p->is_saved = false);
    }

    return $products;
    }

    private function searchVideos(string $q): \Illuminate\Support\Collection
    {
        if (strlen($q) < 1) return collect();

        return Video::active()
            ->with('user:id,name,username,avatar,is_verified')
            ->withCount(['allComments'])
            ->where(function ($query) use ($q) {
                $query->where('title',       'ilike', "%{$q}%")
                      ->orWhere('description','ilike', "%{$q}%")
                      ->orWhereRaw("hashtags::text ilike ?", ["%{$q}%"]);
            })
            ->orderByDesc('views_count')
            ->limit(9)
            ->get()
            ->map(fn ($v) => array_merge($v->toArray(), [
                'thumbnail_url_full' => $v->thumbnail_url_full,
                'video_stream_url'   => $v->video_stream_url,
            ]));
    }

    // ── Trending Videos ───────────────────────────────────────────────────────

    /**
     * Real trending — NOT just highest views_count ever.
     *
     * Score = (interactions_48h × 3) + (views_48h × 1) + recency_boost + personalization_boost
     *
     * - Cached 10 minutes per user (so each user gets slightly different results)
     * - Max 1 video per seller (diversity)
     * - Top 4 are deterministic, bottom half shuffled (so it feels fresh on revisit)
     */
    private function getTrendingVideos(int $limit = 12): array
    {
        $userId   = Auth::id();
        $cacheKey = $userId ? "trending_videos:u:{$userId}" : "trending_videos:guest";

        return Cache::remember($cacheKey, 600, function () use ($userId, $limit) {

            // Candidate pool: last 7 days, fall back to all if not enough
            $candidates = Video::active()
                ->with('user:id,name,username,avatar,is_verified')
                ->where('published_at', '>=', now()->subDays(7))
                ->orderByDesc('published_at')
                ->limit(100)
                ->get();

            if ($candidates->count() < 5) {
                $candidates = Video::active()
                    ->with('user:id,name,username,avatar,is_verified')
                    ->orderByDesc('published_at')
                    ->limit(100)
                    ->get();
            }

            if ($candidates->isEmpty()) return [];

            $videoIds = $candidates->pluck('id')->toArray();

            // Recent interaction velocity (last 48h from feed_events)
            $recentActivity = [];
            try {
                $recentActivity = DB::table('feed_events')
                    ->whereIn('video_id', $videoIds)
                    ->where('occurred_at', '>=', now()->subHours(48))
                    ->whereIn('event', [
                        'video_complete','video_rewatch','video_share',
                        'product_click','product_cart','product_purchase',
                        'product_wishlist','seller_follow',
                    ])
                    ->select('video_id', DB::raw('COUNT(*) as count'))
                    ->groupBy('video_id')
                    ->get()
                    ->keyBy('video_id')
                    ->map(fn ($r) => (int) $r->count)
                    ->toArray();
            } catch (\Throwable) {
                // feed_events empty or missing — fall through
            }

            // Recent views velocity (last 48h from video_views)
            $recentViews = DB::table('video_views')
                ->whereIn('video_id', $videoIds)
                ->where('created_at', '>=', now()->subHours(48))
                ->select('video_id', DB::raw('COUNT(*) as count'))
                ->groupBy('video_id')
                ->get()
                ->keyBy('video_id')
                ->map(fn ($r) => (int) $r->count)
                ->toArray();

            // User affinities for personalization
            $affinities = [];
            if ($userId) {
                try {
                    $affinities = $this->feedService->getUserAffinities($userId);
                } catch (\Throwable) {}
            }

            // Score each video
            $scored = $candidates->map(function (Video $video) use ($recentActivity, $recentViews, $affinities) {
                $interactions  = $recentActivity[$video->id] ?? 0;
                $views48h      = $recentViews[$video->id]    ?? 0;
                $velocityScore = ($interactions * 3) + ($views48h * 1);

                // Recency boost — videos < 24h old get a bump so new content surfaces
                $ageHours     = max(0, now()->diffInHours($video->published_at));
                $recencyBoost = $ageHours < 24 ? (24 - $ageHours) / 24 * 20 : 0;

                // Personalization boost
                $personalBoost = 0;
                if (!empty($affinities['sellers'][$video->user_id])) {
                    $personalBoost += (float) $affinities['sellers'][$video->user_id] * 10;
                }

                // Baseline engagement (so videos with zero recent activity aren't invisible)
                $baseline = ($video->likes_count * 0.5)
                          + ($video->saves_count * 1.0)
                          + ($video->views_count * 0.1);

                $video->_trending_score = $velocityScore + $recencyBoost + $personalBoost + ($baseline * 0.1);
                return $video;
            })->sortByDesc('_trending_score');

            // Diversity: max 1 video per seller
            $result     = collect();
            $sellerSeen = [];
            foreach ($scored as $video) {
                if ($result->count() >= $limit) break;
                if (isset($sellerSeen[$video->user_id])) continue;
                $sellerSeen[$video->user_id] = true;
                $result->push($video);
            }

            // Pad if diversity left us short
            if ($result->count() < min(6, $candidates->count())) {
                $extra  = $scored->whereNotIn('id', $result->pluck('id'))->take($limit - $result->count());
                $result = $result->concat($extra);
            }

            // Shuffle bottom half so it feels different on revisit
            $top    = $result->take(4);
            $bottom = $result->slice(4)->shuffle();

            return $top->concat($bottom)->values()->map(fn ($v) => array_merge($v->toArray(), [
                'thumbnail_url_full' => $v->thumbnail_url_full,
                'video_stream_url'   => $v->video_stream_url,
            ]))->toArray();
        });
    }

    // ── Popular Products ──────────────────────────────────────────────────────

    /**
     * Popular products — blends recent sales velocity + saves + recency + personalization.
     * NOT just orders_count forever (that would always show the same products).
     *
     * Cached 10 minutes per user.
     */
    private function getPopularProducts(int $limit = 12): array
    {
        $userId   = Auth::id();
        $cacheKey = $userId ? "popular_products:u:{$userId}" : "popular_products:guest";

        return Cache::remember($cacheKey, 600, function () use ($userId, $limit) {

            // User's preferred categories
            $preferredCats = [];
            if ($userId) {
                try {
                    $affinities    = $this->feedService->getUserAffinities($userId);
                    $preferredCats = array_keys($affinities['categories'] ?? []);
                } catch (\Throwable) {}
            }

            // Recent order velocity (last 7 days)
            $recentOrders = [];
            try {
                $recentOrders = DB::table('order_items')
                    ->join('orders', 'order_items.order_id', '=', 'orders.id')
                    ->where('orders.created_at', '>=', now()->subDays(7))
                    ->whereIn('orders.status', ['paid', 'processing', 'delivered', 'shipped'])
                    ->select('order_items.product_id', DB::raw('COUNT(*) as count'))
                    ->groupBy('order_items.product_id')
                    ->get()
                    ->keyBy('product_id')
                    ->map(fn ($r) => (int) $r->count)
                    ->toArray();
            } catch (\Throwable) {}

            // Fetch candidate products
            $base = Product::active()->inStock()
                ->with('seller:id,name,username,avatar,is_verified');

            if (!empty($preferredCats)) {
                // Boost preferred categories by fetching them first
                $preferred = (clone $base)
                    ->whereIn('category_id', $preferredCats)
                    ->orderByDesc('views_count')
                    ->limit((int) ceil($limit * 0.6))
                    ->get();

                $general = (clone $base)
                    ->whereNotIn('id', $preferred->pluck('id'))
                    ->orderByDesc('views_count')
                    ->limit($limit - $preferred->count())
                    ->get();

                $products = $preferred->concat($general);
            } else {
                $products = $base->orderByDesc('views_count')->limit($limit)->get();
            }

            // Score each product
            $scored = $products->map(function (Product $product) use ($recentOrders, $preferredCats) {
                $recentSales   = $recentOrders[$product->id] ?? 0;
                $ageHours      = max(0, now()->diffInHours($product->created_at));
                $freshness     = $ageHours < 72 ? (72 - $ageHours) / 72 * 15 : 0;
                $catBoost      = in_array($product->category_id, $preferredCats) ? 10 : 0;

                $product->_pop_score = ($recentSales     * 5)
                                     + ($product->views_count * 0.05)
                                     + ($product->saves_count * 2)
                                     + $freshness
                                     + $catBoost;
                return $product;
            })->sortByDesc('_pop_score');

            // Shuffle bottom half so it varies
            $top    = $scored->take(4);
            $bottom = $scored->slice(4)->shuffle();

            return $top->concat($bottom)->values()->toArray();
        });
    }
}