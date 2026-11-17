<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\TrendingPin;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProductAdminController extends Controller
{
    /** GET /api/admin/products?status=&stock=&search=&seller= */
    public function index(Request $request): JsonResponse
    {
        $q = Product::withTrashed()->with('seller:id,name,username,avatar');

        $status = $request->input('status');
        if ($status === 'deleted')   $q->onlyTrashed();
        else {
            $q->withoutTrashed();
            if ($status) $q->where('status', $status);
        }

        match ($request->input('stock')) {
            'out' => $q->where('stock_quantity', '<=', 0),
            'low' => $q->whereBetween('stock_quantity', [1, 5]),
            'in'  => $q->where('stock_quantity', '>', 0),
            default => null,
        };

        if ($sel = trim((string) $request->input('seller'))) {
            $q->whereHas('seller', fn ($u) => $u->where('username', 'ilike', "%{$sel}%")->orWhere('name', 'ilike', "%{$sel}%"));
        }
        if ($s = trim((string) $request->input('search'))) {
            $q->where(fn ($w) => $w->where('name', 'ilike', "%{$s}%")->orWhere('slug', 'ilike', "%{$s}%"));
        }

        $pinned = TrendingPin::activeIds('product');

        $rows = $q->latest()->paginate(24)->through(fn (Product $p) => [
            'id'          => $p->id,
            'slug'        => $p->slug,
            'name'        => $p->name,
            'status'      => $p->trashed() ? 'deleted' : $p->status,
            'price'       => (float) $p->price,
            'stock'       => (int) $p->stock_quantity,
            'image'       => $p->primary_image,
            'orders_count'=> (int) ($p->orders_count ?? 0),
            'views_count' => (int) ($p->views_count ?? 0),
            'is_featured' => in_array($p->id, $pinned),
            'created_at'  => $p->created_at,
            'seller'      => $p->seller ? ['id' => $p->seller->id, 'name' => $p->seller->name, 'username' => $p->seller->username, 'avatar' => $p->seller->avatar_url ?? null] : null,
        ]);

        $counts = Product::withoutTrashed()->selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');
        $counts['deleted']   = Product::onlyTrashed()->count();
        $counts['out_stock'] = Product::withoutTrashed()->where('stock_quantity', '<=', 0)->count();

        return response()->json(['rows' => $rows, 'counts' => $counts]);
    }

    /** POST /api/admin/products/{id}/moderate  {action: hide|unhide|feature|unfeature|restore, reason?} */
    public function moderate(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'action' => 'required|in:hide,unhide,feature,unfeature,restore',
            'reason' => 'nullable|string|max:500',
        ]);
        if ($data['action'] === 'hide' && blank($data['reason'] ?? null)) {
            return response()->json(['message' => 'A reason is required.'], 422);
        }

        $p = Product::withTrashed()->findOrFail($id);

        switch ($data['action']) {
            case 'hide':     $p->update(['status' => 'archived']); break;
            case 'unhide':   $p->update(['status' => 'active']); break;
            case 'restore':  if ($p->trashed()) $p->restore(); break;
            case 'feature':
                TrendingPin::updateOrCreate(['kind' => 'product', 'item_id' => $p->id], ['pinned_by' => Auth::id(), 'expires_at' => now()->addDays(7)]);
                break;
            case 'unfeature':
                TrendingPin::where('kind', 'product')->where('item_id', $p->id)->delete();
                break;
        }

        Audit::log('product.' . $data['action'], $p, ['name' => $p->name, 'reason' => $data['reason'] ?? null]);
        match ($data['action']) {
            'hide'      => \App\Notifications\AccountNotice::send($p->seller, 'product_removed', 'A product was hidden', "“{$p->name}” was hidden from the shop.", '/seller/products', 'See my products', 'account', [], ['Reason: ' . ($data['reason'] ?? '—')]),
            'unhide', 'restore' => \App\Notifications\AccountNotice::send($p->seller, 'product_restored', 'Your product is back', "“{$p->name}” is visible in the shop again.", '/seller/products', 'See my products', 'account'),
            'feature'   => \App\Notifications\AccountNotice::send($p->seller, 'product_featured', '🌟 Your product is featured!', "“{$p->name}” was picked as a featured product this week.", '/seller/products', 'See my products', 'account'),
            default     => null,
        };
        return response()->json(['message' => 'Done.']);
    }

    /** DELETE /api/admin/products/{id} (soft delete) */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $p = Product::findOrFail($id);
        $p->delete();
        Audit::log('product.delete', $p, ['name' => $p->name, 'reason' => $request->reason]);
        \App\Notifications\AccountNotice::send($p->seller, 'product_removed', 'A product was removed', "“{$p->name}” was removed by the Flockr team.", '/seller/products', 'See my products', 'account', [], ['Reason: ' . $request->reason]);
        return response()->json(['message' => 'Product deleted.']);
    }
}
