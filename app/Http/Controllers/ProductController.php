<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Services\JinaService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private readonly JinaService    $jina,
        private readonly StorageService $storage,
    ) {}

    // ── Inertia Pages ─────────────────────────────────────────────────────────

    public function shop(): Response
    {
        $categories = Category::where('is_active', true)->orderBy('sort_order')->get();

        $featured = Product::active()->inStock()
            ->with('seller:id,name,username,avatar,is_verified')
            ->withCount('orderItems')
            ->orderByDesc('order_items_count')
            ->limit(24)
            ->get();

        return Inertia::render('Shop/Index', [
            'categories'       => $categories,
            'featuredProducts' => $featured,
        ]);
    }

    public function show(Product $product): Response
    {
        abort_if($product->status !== 'active', 404);
        $product->increment('views_count');
        $product->load([
            'seller:id,name,username,avatar,is_verified,total_sales,location',
            'category:id,name',
            'videos' => fn ($q) => $q->where('status', 'active')->limit(6),
        ]);

        $similar = collect();
        try {
            $similar = $this->jina->similarProducts($product, 6);
        } catch (\Throwable) {}

        $isSaved = Auth::check() && $product->savedByUsers()->where('user_id', Auth::id())->exists();

        return Inertia::render('Product/Show', [
            'product'         => array_merge($product->toArray(), ['is_saved' => $isSaved]),
            'similarProducts' => $similar,
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
            'product'    => $product,
            'categories' => Category::where('is_active', true)->get(),
        ]);
    }

    // ── API ───────────────────────────────────────────────────────────────────

    /** GET /api/shop/products */
    public function apiIndex(Request $request): JsonResponse
    {
        $query = Product::active()->inStock()
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

        $query = match ($request->input('sort', 'popular')) {
            'newest'     => $query->latest(),
            'price_asc'  => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            default      => $query->orderByDesc('order_items_count'),
        };

        return response()->json($query->paginate($request->input('per_page', 24)));
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
            'price'            => 'required|numeric|min:1',
            'compare_price'    => 'nullable|numeric|min:1',
            'stock_quantity'   => 'required|integer|min:1',
            'category_id'      => 'nullable|exists:categories,id',
            'condition'        => 'required|in:new,used,refurbished',
            'ships_nationwide' => 'boolean',
            'shipping_fee'     => 'nullable|numeric|min:0',
            'tags'             => 'nullable|array|max:20',
            'attributes'       => 'nullable|array',
        ]);

        // ── Generate a unique slug from the product name ──────────────────────
        $baseSlug = Str::slug($validated['name']);
        $slug     = $baseSlug;
        $i        = 1;
        while (Product::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $i++;
        }

        $product = Auth::user()->products()->create([
            ...$validated,
            'slug'     => $slug,
            'status'   => 'active',
            'location' => Auth::user()->location,
        ]);

        return response()->json($product, 201);
    }

    /** PUT /api/products/{product} */
    public function update(Request $request, Product $product): JsonResponse
    {
        abort_unless(Auth::id() === $product->seller_id, 403);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:200',
            'description'    => 'nullable|string|max:5000',
            'price'          => 'sometimes|numeric|min:1',
            'compare_price'  => 'nullable|numeric|min:1',
            'stock_quantity' => 'sometimes|integer|min:0',
            'status'         => 'sometimes|in:draft,active,archived',
            'tags'           => 'nullable|array',
            'attributes'     => 'nullable|array',
        ]);

        // Re-slug if name changed
        if (isset($validated['name']) && $validated['name'] !== $product->name) {
            $baseSlug = Str::slug($validated['name']);
            $slug     = $baseSlug;
            $i        = 1;
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
        $user  = Auth::user();
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
    public function uploadImages(Request $request, Product $product): JsonResponse
    {
        if (Auth::id() !== $product->seller_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'images'   => 'required|array|max:6',
            'images.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        try {
            $keys = [];
            foreach ($request->file('images') as $file) {
                $keys[] = $this->storage->uploadImage($file, 'products');
            }

            $existing = $product->images ?? [];
            $product->update(['images' => array_merge($existing, $keys)]);

            $imageUrls = array_map(
                fn ($key) => $this->storage->url($key),
                $product->fresh()->images
            );

            return response()->json(['images' => $imageUrls]);
        } catch (\Throwable $e) {
            Log::error('Product image upload failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Image upload failed: ' . $e->getMessage()], 500);
        }
    }
}