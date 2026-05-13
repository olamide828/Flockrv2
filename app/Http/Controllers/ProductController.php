<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateProductDescriptionJob;
use App\Models\Category;
use App\Models\Product;
use App\Services\JinaService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private readonly JinaService    $jina,
        private readonly StorageService $storage,
    ) {}

    // ── Inertia pages ─────────────────────────────────────────────────────────

    public function shop(): Response
    {
        $categories = Category::where('is_active', true)->orderBy('sort_order')->get();
        $featured   = Product::active()->inStock()
            ->with('seller:id,name,username,avatar,is_verified')
            ->withCount('orders')
            ->orderByDesc('orders_count')
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
            'videos' => fn ($q) => $q->active()->limit(6),
        ]);

        $similar = $this->jina->similarProducts($product, 6);
        $isSaved = Auth::check() && $product->savedByUsers()->where('user_id', Auth::id())->exists();

        return Inertia::render('Product/Show', [
            'product'          => array_merge($product->toArray(), ['is_saved' => $isSaved]),
            'similarProducts'  => $similar,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Seller/ProductCreate', [
            'categories' => Category::where('is_active', true)->get(),
        ]);
    }

    public function edit(Product $product): Response
    {
        $this->authorize('update', $product);
        return Inertia::render('Seller/ProductEdit', [
            'product'    => $product,
            'categories' => Category::where('is_active', true)->get(),
        ]);
    }

    // ── API ───────────────────────────────────────────────────────────────────

    /** GET /api/shop/products — paginated + filtered product listing */
    public function apiIndex(Request $request): JsonResponse
    {
        $query = Product::active()->inStock()
            ->with('seller:id,name,username,avatar,is_verified')
            ->withCount('orders');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('price_min')) {
            $query->where('price', '>=', $request->price_min);
        }
        if ($request->filled('price_max')) {
            $query->where('price', '<=', $request->price_max);
        }
        if ($request->filled('condition')) {
            $query->where('condition', $request->condition);
        }

        $query = match ($request->input('sort', 'popular')) {
            'newest'     => $query->latest(),
            'price_asc'  => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            default      => $query->orderByDesc('orders_count'),
        };

        return response()->json($query->paginate($request->input('per_page', 24)));
    }

    /** POST /api/products — create product */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Product::class);

        $validated = $request->validate([
            'name'            => 'required|string|max:200',
            'description'     => 'nullable|string|max:5000',
            'price'           => 'required|numeric|min:1',
            'compare_price'   => 'nullable|numeric|min:1',
            'stock_quantity'  => 'required|integer|min:0',
            'category_id'     => 'nullable|exists:categories,id',
            'condition'       => 'required|in:new,used,refurbished',
            'ships_nationwide'=> 'boolean',
            'shipping_fee'    => 'nullable|numeric|min:0',
            'tags'            => 'nullable|array|max:20',
            'attributes'      => 'nullable|array',
        ]);

        $product = Auth::user()->products()->create([
            ...$validated,
            'status' => 'active',
        ]);

        // Queue AI description + embedding generation
        GenerateProductDescriptionJob::dispatch($product);

        return response()->json($product, 201);
    }

    /** PUT /api/products/{product} */
    public function update(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);

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

        $product->update($validated);

        // Re-index if key fields changed
        if (array_intersect(array_keys($validated), ['name', 'description', 'tags'])) {
            $this->jina->indexProduct($product->fresh());
        }

        return response()->json($product->fresh());
    }

    /** DELETE /api/products/{product} */
    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);
        $product->delete();
        return response()->json(['message' => 'Product deleted.']);
    }

    /** POST /api/products/{product}/save — toggle wishlist */
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

    /** POST /api/products/{product}/images — upload product images */
    public function uploadImages(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);
        $request->validate(['images' => 'required|array|max:6', 'images.*' => 'image|max:5120']);

        $keys = [];
        foreach ($request->file('images') as $file) {
            $keys[] = $this->storage->uploadImage($file, 'products');
        }

        $existing = $product->images ?? [];
        $product->update(['images' => array_merge($existing, $keys)]);

        return response()->json(['images' => $product->fresh()->images]);
    }
}
