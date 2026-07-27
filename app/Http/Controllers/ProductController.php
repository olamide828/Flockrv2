<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessProductImage;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSku;
use App\Models\Review;
use App\Services\JinaService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{

    private const COMMISSION_RATE = 0.05;

    public function __construct(
        private readonly JinaService $jina,
        private readonly StorageService $storage,
    ) {
    }

    // ── Helper: IDs of sellers this user has blocked (or been blocked by) ─────
    private function blockedSellerIds(): array
    {
        $userId = Auth::id();
        if (!$userId)
            return [];

        return DB::table('user_blocks')
            ->where('blocker_id', $userId)
            ->orWhere('blocked_id', $userId)
            ->get()
            ->map(fn($row) => $row->blocker_id === $userId ? $row->blocked_id : $row->blocker_id)
            ->unique()
            ->values()
            ->toArray();
    }

    // ── Inertia Pages ─────────────────────────────────────────────────────────

    public function shop(): Response
{
    $blocked    = $this->blockedSellerIds();
    $categories = Category::where('is_active', true)->orderBy('sort_order')->get();

    $featured = Product::active()
        ->when(!empty($blocked), fn($q) => $q->whereNotIn('seller_id', $blocked))
        ->with('seller:id,name,username,avatar,is_verified')
        ->withCount('orderItems')
        ->orderByDesc('order_items_count')
        ->limit(24)
        ->get();

    // ── ADD THIS: batch-fetch is_saved for current user ───────────────────
    $userId = Auth::id();
    if ($userId) {
        $savedIds = \DB::table('product_saves')
            ->where('user_id', $userId)
            ->whereIn('product_id', $featured->pluck('id')->toArray())
            ->pluck('product_id')
            ->flip()
            ->toArray();

        $featured->each(function ($product) use ($savedIds) {
            $product->is_saved = isset($savedIds[$product->id]);
        });
    } else {
        $featured->each(fn($p) => $p->is_saved = false);
    }
    // ─────────────────────────────────────────────────────────────────────

    return Inertia::render('Shop/Index', [
        'categories'       => $categories,
        'featuredProducts' => $featured,
    ]);
}

    public function show(string $username, Product $product): Response
    {
        if ($product->status !== 'active' || $product->trashed()) {
    return Inertia::render('Errors/ProductGone', [
        'categoryName' => $product->category?->name,
        'categoryId'   => $product->category_id,
    ]);
}

        $blocked = $this->blockedSellerIds();
        abort_if(in_array($product->seller_id, $blocked), 404);

        $product->load([
            'seller' => fn($q) => $q->select([
                'id', 'name', 'username', 'avatar', 'is_verified',
                'total_sales', 'location', 'avg_rating', 'total_reviews',
            ]),
            'category:id,name',
            'videos' => fn($q) => $q->where('status', 'active')
                ->with('user:id,name,username')
                ->limit(6),
        ]);

        abort_if(!$product->seller || $product->seller->username !== $username, 404);

        $product->increment('views_count');

        // Similar products
        $similar = collect();
        try {
            $similar = $this->jina->similarProducts($product, 6);
            if (!empty($blocked)) {
                $similar = $similar->filter(fn($p) => !in_array($p->seller_id, $blocked))->values();
            }
            $similar->load('seller:id,name,username,avatar,is_verified');
        } catch (\Throwable) {}

        $isSaved = Auth::check()
            && $product->savedByUsers()->where('user_id', Auth::id())->exists();

        // ── Per-product rating ────────────────────────────────────────────────
        $productAvgRating    = (float) ($product->avg_rating ?? 0);
        $productTotalReviews = (int)   ($product->total_reviews ?? 0);

        // ── Initial reviews for this specific product ─────────────────────────
        $reviews = \App\Models\Review::where('product_id', $product->id)
            ->with('buyer:id,name,avatar')
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn($r) => array_merge($r->toArray(), [
                'photo_urls' => $r->photo_urls,
                'buyer'      => array_merge($r->buyer?->toArray() ?? [], [
                    'avatar_url' => $r->buyer?->avatar_url,
                ]),
            ]));

        // ── Find an eligible order for the review form ────────────────────────
        $userOrderId = null;
        try {
            if ($user = Auth::user()) {
                $eligibleOrder = \App\Models\Order::where('buyer_id', $user->id)
                    ->where('seller_id', $product->seller_id)
                    ->where('status', 'delivered')
                    ->whereHas('items', fn($q) => $q->where('product_id', $product->id))
                    ->whereDoesntHave('review')  // no existing review for this order
                    ->latest()
                    ->first();
                $userOrderId = $eligibleOrder?->id;
            }
        } catch (\Throwable) {}

        return Inertia::render('Product/Show', [
            'product'        => array_merge($product->toArray(), [
                'is_saved'          => $isSaved,
                // Per-product rating (shown on this product page)
                'avg_rating'        => $productAvgRating,
                'total_reviews'     => $productTotalReviews,
                // Seller overall rating (shown on seller card)
                'seller'            => array_merge($product->seller->toArray(), [
                    'avg_rating'    => (float) ($product->seller->avg_rating ?? 0),
                    'total_reviews' => (int)   ($product->seller->total_reviews ?? 0),
                    'avatar_url'    => $product->seller->avatar_url,
                ]),
            ]),
            'similarProducts' => $similar,
            'reviews'         => $reviews,
            'userOrderId'     => $userOrderId,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Seller/ProductCreate', [
            'categories' => Category::where('is_active', true)->orderBy('sort_order')->get(),
        ]);
    }

    public function edit(Product $product): Response
    {
        abort_unless(Auth::id() === $product->seller_id, 403);
        return Inertia::render('Seller/ProductEdit', [
            'product' => $product,
            'categories' => Category::where('is_active', true)->get(),
        ]);
    }

    // ── API ───────────────────────────────────────────────────────────────────

    /** GET /api/shop/products */
    public function apiIndex(Request $request): JsonResponse
    {
        $blocked = $this->blockedSellerIds();

        $query = Product::active()
            ->when(!empty($blocked), fn($q) => $q->whereNotIn('seller_id', $blocked))
            ->with('seller:id,name,username,avatar,is_verified')
            ->withCount('orderItems');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('price_min')) {
            $query->where('price', '>=', (float) $request->price_min);
        }
        if ($request->filled('price_max') && (float) $request->price_max > 0) {
            $query->where('price', '<=', (float) $request->price_max);
        }
        if ($request->filled('condition')) {
            $query->where('condition', $request->condition);
        }
        if ($request->filled('seller_id')) {
            $query->where('seller_id', $request->seller_id);
        }
      if ($request->filled('q')) {
    $q = $request->q;
    $query->where(
        fn($query) =>
        $query->where('name', 'ilike', "%{$q}%")
              ->orWhere('description', 'ilike', "%{$q}%")
              ->orWhereRaw("tags::text ilike ?", ["%{$q}%"])
    );
}

        $query = match ($request->input('sort', 'popular')) {
            'newest' => $query->latest(),
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            default => $query->orderByDesc('order_items_count'),
        };

        $products = $query->paginate($request->input('per_page', 24));

        // ── Batch-fetch is_saved for current user (3 lines, no N+1) ──────────
        $userId = Auth::id();
        if ($userId) {
            $pageIds  = collect($products->items())->pluck('id')->toArray();
            $savedIds = \DB::table('product_saves')
                ->where('user_id', $userId)
                ->whereIn('product_id', $pageIds)
                ->pluck('product_id')
                ->flip()
                ->toArray();

            $products->getCollection()->transform(function ($product) use ($savedIds) {
                $product->is_saved = isset($savedIds[$product->id]);
                return $product;
            });
        } else {
            $products->getCollection()->transform(function ($product) {
                $product->is_saved = false;
                return $product;
            });
        }

        return response()->json($products);
    }


    /** POST /api/products */
    public function store(Request $request): JsonResponse
{
    if (!Auth::check() || Auth::user()->role !== 'seller') {
        return response()->json(['message' => 'Only sellers can create products.'], 403);
    }

    $validated = $request->validate([
        'name'             => 'required|string|max:200',
        'description'      => 'nullable|string|max:5000',
        'seller_price'     => 'required|numeric|min:1',   // ← seller inputs this
        'compare_price'    => 'nullable|numeric|min:1',
        'stock_quantity'   => 'required|integer|min:1',
        'category_id'      => 'nullable|exists:categories,id',
        'condition'        => 'required|in:new,used,refurbished',
        'ships_nationwide' => 'boolean',
        'shipping_fee'     => 'nullable|numeric|min:0',
        'tags'             => 'nullable|array|max:20',
        'attributes'       => 'nullable|array',
    ]);

    // Compute listed price: seller always receives exactly seller_price.
    // Flockr's 5% comes out of the buyer-facing price, not seller's pocket.
    $sellerPrice = (float) $validated['seller_price'];
    $listedPrice = ceil($sellerPrice / (1 - self::COMMISSION_RATE)); // rounds up to nearest naira

    $baseSlug = Str::slug($validated['name']);
    $slug = $baseSlug;
    $i = 1;
    while (Product::where('slug', $slug)->exists()) {
        $slug = $baseSlug . '-' . $i++;
    }

    $product = Auth::user()->products()->create([
        ...$validated,
        'price'        => $listedPrice,   // what buyer sees and pays
        'seller_price' => $sellerPrice,   // what seller receives
        'slug'         => $slug,
        'status'       => 'active',
        'location'     => Auth::user()->location,
    ]);

    // Notify followers
    $seller = Auth::user();
    $seller->followers()->chunk(100, function ($followers) use ($product) {
        foreach ($followers as $follower) {
            $follower->notify(new \App\Notifications\NewProductNotification($product));
        }
    });

    return response()->json($product, 201);
}


    /** PUT /api/products/{product} */
public function update(Request $request, Product $product): JsonResponse
{
    abort_unless(Auth::id() === $product->seller_id, 403);

    $validated = $request->validate([
        'name'             => 'sometimes|string|max:200',
        'description'      => 'nullable|string|max:5000',
        'seller_price'     => 'sometimes|numeric|min:1',   // ← seller edits this
        'compare_price'    => 'nullable|numeric|min:1',
        'stock_quantity'   => 'sometimes|integer|min:0',
        'status'           => 'sometimes|in:draft,active,archived',
        'condition'        => 'sometimes|in:new,used,refurbished',
        'ships_nationwide' => 'sometimes|boolean',
        'shipping_fee'     => 'nullable|numeric|min:0',
        'category_id'      => 'nullable|exists:categories,id',
        'tags'             => 'nullable|array',
        'attributes'       => 'nullable|array',
    ]);

    // Re-compute listed price if seller_price changed
    if (isset($validated['seller_price'])) {
        $sellerPrice = (float) $validated['seller_price'];
        $validated['price'] = (int) ceil($sellerPrice / (1 - self::COMMISSION_RATE));
        $validated['seller_price'] = $sellerPrice;
    }

    if (isset($validated['name']) && $validated['name'] !== $product->name) {
        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $i = 1;
        while (Product::where('slug', $slug)->where('id', '!=', $product->id)->exists()) {
            $slug = $baseSlug . '-' . $i++;
        }
        $validated['slug'] = $slug;
    }

    $product->update($validated);
    return response()->json($product->fresh());
}

    /** DELETE /api/products/{product} */
    public function destroy(Product $product): JsonResponse
    {
        abort_unless(Auth::id() === $product->seller_id || Auth::user()->isAdmin(), 403);
        $product->delete();
        return response()->json(['message' => 'Product deleted.']);
    }

    /** POST /api/products/{product}/save */
    public function save(Product $product): JsonResponse
    {
        $user = Auth::user();
        $saved = $product->savedByUsers()->where('user_id', $user->id)->exists();

        if ($saved) {
            $product->savedByUsers()->detach($user->id);
            $product->decrement('saves_count');
        } else {
            $product->savedByUsers()->attach($user->id);
            $product->increment('saves_count');
        }

        return response()->json(['saved' => !$saved]);
    }

    /** POST /api/products/{product}/images */
    /**
 * REPLACE your existing uploadImages() method in ProductController with this.
 * Everything else in ProductController stays the same.
 *
 * Also add this import at the top of ProductController:
 *   use App\Jobs\ProcessProductImage;
 */
 
    /**
     * POST /api/products/{product}/images
     *
     * What changed from original:
     * - After saving each image, dispatches ProcessProductImage job
     * - Job runs async (database queue) — remove.bg + Intervention Image
     * - Returns immediately with the original image URLs
     * - Frontend polls or user sees "processing" state
     * - If remove.bg fails, original image stays — graceful degradation
     */
    public function uploadImages(Request $request, Product $product): JsonResponse
    {
        if (Auth::id() !== $product->seller_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
 
        $request->validate([
            'images'   => 'required|array|max:6',
            'images.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120', // 5MB each
        ]);
 
        try {
            $existingImages = $product->images ?? [];
            $newKeys        = [];
 
            foreach ($request->file('images') as $file) {
                // Save original image immediately (fast response to seller)
                $key       = $this->storage->uploadImage($file, 'products');
                $newKeys[] = $key;
            }
 
            // Merge new keys with existing
            $allImages = array_merge($existingImages, $newKeys);
            $product->update(['images' => $allImages]);
 
            // Dispatch background processing job for each new image
            // Job will: remove background → white canvas → shadow → replace key in DB
            $removeBgEnabled = !empty(config('services.remove_bg.api_key'));
 
            if ($removeBgEnabled) {
                foreach ($newKeys as $i => $key) {
                    $imageIndex = count($existingImages) + $i; // position in full array
                    ProcessProductImage::dispatch($product->id, $key, $imageIndex)
                        ->onQueue('images'); // separate queue so it doesn't block other jobs
                }
            }
 
            // Return URLs immediately — frontend shows originals while jobs run
            $fresh     = $product->fresh();
            $imageUrls = array_map(
                fn ($k) => $this->storage->url($k),
                $fresh->images
            );
 
            return response()->json([
                'images'     => $imageUrls,
                'processing' => $removeBgEnabled, // tells frontend whether to show "enhancing" state
                'message'    => $removeBgEnabled
                    ? 'Images uploaded. Background removal is running in background.'
                    : 'Images uploaded successfully.',
            ]);
 
        } catch (\Throwable $e) {
            Log::error('Product image upload failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Image upload failed: ' . $e->getMessage()], 500);
        }
    }

    public function generateSummary(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'product_id' => ['required', 'integer', 'exists:products,id'],
            ]);

            $product = Product::with('seller:id,name,username')->findOrFail($request->product_id);

            $prompt = "Create an engaging ecommerce product summary not more or less than 50 words.

CRITICAL INSTRUCTION: Return ONLY the summary itself. Do NOT include any introductory phrases, conversational fillers, or meta-commentary. Start directly with the summary content.

Product Name: {$product->name}
Description: {$product->description}
Price: {$product->price}";

            $response = Http::timeout(30)->post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' . env('GEMINI_API_KEY'),
                ['contents' => [['parts' => [['text' => $prompt]]]]]
            );

            if ($response->status() === 429) {
                return response()->json(['message' => 'AI summary limit reached. Please try again in a minute.'], 429);
            }

            $content = data_get($response->json(), 'candidates.0.content.parts.0.text');

            if (!$content) {
                return response()->json(['message' => 'Gemini request failed.', 'response' => $response->json()], 500);
            }

            return response()->json(['summary' => trim($content)]);

        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function getImages(Product $product): JsonResponse
{
    if (Auth::id() !== $product->seller_id) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }

    $imageUrls = array_map(
        fn ($k) => $this->storage->url($k),
        $product->fresh()->images ?? []
    );

    return response()->json(['image_urls' => $imageUrls]);
}


}