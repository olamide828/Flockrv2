<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Video;
use App\Models\VideoView;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SellerController extends Controller
{
    public function dashboard(): Response
    {
        $seller = Auth::user();
        $period = 30; // days

        $stats = [
            'revenue'           => Order::forSeller($seller->id)->paid()
                ->where('created_at', '>=', now()->subDays($period))
                ->sum('total'),
            'orders_count'      => Order::forSeller($seller->id)->paid()
                ->where('created_at', '>=', now()->subDays($period))
                ->count(),
            'views_count'       => VideoView::whereIn('video_id', $seller->videos()->pluck('id'))
                ->where('created_at', '>=', now()->subDays($period))
                ->count(),
            'followers_count'   => $seller->followers_count,
            'revenue_change'    => $this->changePercent($seller->id, 'revenue', $period),
            'orders_change'     => $this->changePercent($seller->id, 'orders', $period),
        ];

        $recentOrders = Order::forSeller($seller->id)
            ->with('buyer:id,name,username,avatar')
            ->withCount('items')
            ->latest()
            ->limit(8)
            ->get();

        $topProducts = $seller->products()
            ->withCount('orderItems')
            ->orderByDesc('orders_count')
            ->limit(5)
            ->get();

        $recentVideos = $seller->videos()
            ->orderByDesc('created_at')
            ->limit(11)
            ->get();

        return Inertia::render('Seller/Dashboard', compact('stats', 'recentOrders', 'topProducts', 'recentVideos'));
    }

    public function videos(): Response
    {
        $videos = Auth::user()->videos()
            ->withCount(['likes', 'comments'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Seller/Videos', ['videos' => $videos]);
    }

    public function products(): Response
    {
        $products = Auth::user()->products()
            ->with('category:id,name')
            ->withCount('orderItems')
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Seller/Products', ['products' => $products]);
    }

    public function orders(): Response
    {
        $orders = Order::forSeller(Auth::id())
            ->with('buyer:id,name,username,avatar')
            ->withCount('items')
            ->latest()
            ->paginate(20);

        return Inertia::render('Seller/Orders', ['orders' => $orders]);
    }

    public function payouts(): Response
    {
        $payouts = \App\Models\Payout::where('seller_id', Auth::id())->latest()->paginate(20);
        $balance = Auth::user()->wallet_balance;
        return Inertia::render('Seller/Payouts', compact('payouts', 'balance'));
    }

    public function settings(): Response
    {
        return Inertia::render('Settings/Profile');
    }

    public function stats(): JsonResponse
    {
        $seller = Auth::user();
        return response()->json([
            'wallet_balance' => $seller->wallet_balance,
            'total_sales'    => $seller->total_sales,
            'revenue_total'  => $seller->revenue_total,
        ]);
    }

    public function payoutsApi(): JsonResponse
    {
        return response()->json(
            \App\Models\Payout::where('seller_id', Auth::id())->latest()->paginate(10)
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function changePercent(int $sellerId, string $metric, int $days): float
    {
        $current  = Order::forSeller($sellerId)->paid()->where('created_at', '>=', now()->subDays($days));
        $previous = Order::forSeller($sellerId)->paid()
            ->whereBetween('created_at', [now()->subDays($days * 2), now()->subDays($days)]);

        [$cur, $prev] = match ($metric) {
            'revenue' => [$current->sum('total'), $previous->sum('total')],
            default   => [$current->count(),      $previous->count()],
        };

        if ($prev == 0) return $cur > 0 ? 100 : 0;
        return round((($cur - $prev) / $prev) * 100, 1);
    }
}
