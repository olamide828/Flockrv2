<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Notifications\ProductRestockedNotification;
use App\Services\RestockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RestockController extends Controller
{
    /** POST /api/products/{product}/restock  { quantity } — seller adds stock. */
    public function restock(Request $request, Product $product, RestockService $svc): JsonResponse
    {
        abort_unless(Auth::id() === $product->seller_id, 403);
        $data = $request->validate(['quantity' => 'required|integer|min:1|max:100000']);

        if (method_exists($product, 'skus') && $product->skus()->exists()) {
            return response()->json(['message' => 'This product has variants. Edit the product to restock each variant.'], 422);
        }

        $r = $svc->restock($product, (int) $data['quantity']);

        return response()->json([
            'message'   => $r['announced']
                ? "Restocked! {$r['notified']} " . ($r['notified'] === 1 ? 'person was' : 'people were') . ' notified.'
                : 'Stock updated.',
            'stock'     => $r['stock'],
            'announced' => $r['announced'],
            'notified'  => $r['notified'],
        ]);
    }

    /** GET /api/products/{product}/restock-audience — preview shown in the seller's restock sheet. */
    public function audience(Product $product): JsonResponse
    {
        abort_unless(Auth::id() === $product->seller_id, 403);
        $saved     = DB::table('product_saves')->where('product_id', $product->id)->distinct()->count('user_id');
        $followers = Auth::user()->followers()->count();
        return response()->json(['saved' => $saved, 'followers' => $followers, 'stock' => (int) $product->stock_quantity]);
    }

    /**
     * GET /api/restock-alerts — unread "your saved item is back" notifications whose product is still in stock.
     * Drives the animated modal. Stale ones (sold out again / deleted) are quietly marked read.
     */
    public function alerts(): JsonResponse
    {
        $user  = Auth::user();
        $notes = $user->unreadNotifications()
            ->where('type', ProductRestockedNotification::class)
            ->latest()->limit(20)->get()
            ->filter(fn ($n) => ($n->data['audience'] ?? '') === 'wishlist' && $n->created_at->gt(now()->subDays(5)));

        $products = Product::whereIn('id', $notes->pluck('data.product_id')->filter()->unique())
            ->with('seller:id,name,username')->get()->keyBy('id');

        $items = [];
        foreach ($notes as $n) {
            $p = $products[$n->data['product_id'] ?? 0] ?? null;
            if (!$p || $p->status !== 'active' || (int) $p->stock_quantity <= 0) { $n->markAsRead(); continue; }
            $items[] = [
                'notification_id' => $n->id,
                'id'     => $p->id,
                'name'   => $p->name,
                'image'  => $p->primary_image,
                'price'  => (float) $p->price,
                'stock'  => (int) $p->stock_quantity,
                'seller' => $p->seller?->name,
                'url'    => '/@' . ($p->seller?->username ?? '') . '/products/' . $p->slug,
            ];
        }
        return response()->json(['items' => $items]);
    }

    /** POST /api/restock-alerts/dismiss  { ids?: [] }  (no ids = all) */
    public function dismiss(Request $request): JsonResponse
    {
        $q = Auth::user()->unreadNotifications()->where('type', ProductRestockedNotification::class);
        if ($ids = $request->input('ids')) $q->whereIn('id', (array) $ids);
        $q->get()->each->markAsRead();
        return response()->json(['ok' => true]);
    }
}
