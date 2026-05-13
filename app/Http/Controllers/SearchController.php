<?php

namespace App\Http\Controllers;

use App\Models\Video;
use App\Services\JinaService;
use App\Services\OpenAIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        $trending = Video::active()
            ->forFeed()
            ->orderByDesc('views_count')
            ->limit(12)
            ->get();

        return Inertia::render('Explore/Index', [
            'trendingVideos'   => $trending,
            'trendingProducts' => \App\Models\Product::active()->inStock()
                ->with('seller:id,name,username,avatar,is_verified')
                ->orderByDesc('orders_count')
                ->limit(12)
                ->get(),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $q      = trim($request->input('q', ''));
        $limit  = min((int) $request->input('limit', 20), 50);

        if (strlen($q) < 2) {
            return response()->json(['products' => [], 'videos' => []]);
        }

        // Parse intent with GPT-4o-mini (cached per query)
        $cacheKey = 'search_intent:' . md5($q);
        $intent   = \Cache::remember($cacheKey, 3600, fn () => $this->openai->parseSearchIntent($q));

        // Build filters from parsed intent
        $filters = array_filter([
            'category_id' => $request->input('category_id'),
            'price_min'   => $intent['price_min'] ?? null,
            'price_max'   => $request->filled('price_max') ? $request->price_max : ($intent['price_max'] ?? null),
        ]);

        // Semantic product search
        $products = $this->jina->searchProducts($q, $limit, $filters);

        // Semantic video search
        $videoVector    = $this->jina->embedQuery($q);
        $vectorStr      = '[' . implode(',', $videoVector) . ']';
        $videoIds       = collect(\DB::select(
            "SELECT id FROM videos WHERE status = 'active' AND embedding IS NOT NULL
             ORDER BY embedding <-> ?::vector LIMIT 6",
            [$vectorStr]
        ))->pluck('id');

        $videos = Video::forFeed()
            ->whereIn('id', $videoIds)
            ->get()
            ->sortBy(fn ($v) => $videoIds->search($v->id))
            ->values();

        return response()->json([
            'products' => $products,
            'videos'   => $videos,
            'intent'   => $intent,
        ]);
    }
}
