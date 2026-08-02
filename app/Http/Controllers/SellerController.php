<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Video;
use App\Models\VideoView;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Carbon\Carbon;

class SellerController extends Controller
{
    public function dashboard(): Response
    {
        $seller = Auth::user();
        $period = 30; 

        $stats = [
            'revenue' => Order::forSeller($seller->id)->paid()
                ->where('created_at', '>=', now()->subDays($period))
                ->sum('total'),
            'orders_count' => Order::forSeller($seller->id)->paid()
                ->where('created_at', '>=', now()->subDays($period))
                ->count(),
            
'views_count' => $seller->videos()->sum('views_count'),
            'followers_count' => $seller->followers_count,
            'revenue_change' => $this->changePercent($seller->id, 'revenue', $period),
            'orders_change' => $this->changePercent($seller->id, 'orders', $period),
        ];




        $recentOrders = Order::forSeller($seller->id)
            ->with('buyer:id,name,username,avatar')
            ->withCount('items')
            ->latest()
            ->limit(12)
            ->get();

        $topProducts = $seller->products()
            ->withCount('orderItems')
            ->orderByDesc('order_items_count')
            ->limit(9)
            ->get(['id', 'name', 'price', 'images', 'orders_count']);

        $recentVideos = $seller->videos()
            ->orderByDesc('created_at')
            ->limit(3)
            ->with('user:id,name,username')
            ->get(['id', 'ulid', 'user_id', 'title', 'thumbnail_url', 'status', 'views_count', 'likes_count', 'published_at']);


        $orders = $seller->orders()
    ->with(['seller:id,name,username,avatar', 'items.product'])
    ->latest()
    ->limit(20)
    ->get();

$savedProducts = $seller->savedProducts()
    ->with('seller:id,name,username,avatar,is_verified')
    ->get();

$savedProducts->each(fn($p) => $p->is_saved = true);

$savedVideos = $seller->savedVideos()
    ->with('user:id,name,username,avatar')
    ->get();

// ── Gamification ─────────────────────────────────────────────────────────
$totalVideos = $seller->videos()->count();
$totalViewsAllTime = $seller->videos()->sum('views_count');
$totalOrdersAllTime = Order::forSeller($seller->id)->paid()->count();

$xp = (int) round(
    ($totalVideos * 50) + ($totalViewsAllTime * 0.1) + ($totalOrdersAllTime * 100) + ($seller->followers_count * 5)
);

$levelThresholds = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000, 50000];
$level = 1;
foreach ($levelThresholds as $i => $threshold) {
    if ($xp >= $threshold) $level = $i + 1;
}
$currentThreshold = $levelThresholds[$level - 1] ?? 0;
$nextThreshold = $levelThresholds[$level] ?? ($currentThreshold * 2);

$publishDates = $seller->videos()
    ->whereNotNull('published_at')
    ->orderByDesc('published_at')
    ->pluck('published_at')
    ->map(fn ($d) => $d->format('Y-m-d'))
    ->unique()
    ->values();

$streak = 0;
$cursor = now()->startOfDay();
foreach ($publishDates as $date) {
    if ($date === $cursor->format('Y-m-d')) {
        $streak++;
        $cursor->subDay();
    } else {
        break;
    }
}

$badges = [
    ['key' => 'first_sale',        'label' => 'First Sale',          'earned' => $totalOrdersAllTime >= 1],
    ['key' => 'ten_sales',         'label' => '10 Sales',            'earned' => $totalOrdersAllTime >= 10],
    ['key' => 'viral_debut',       'label' => 'Viral Debut',         'earned' => $seller->videos()->where('views_count', '>=', 1000)->exists()],
    ['key' => 'consistent',        'label' => 'Consistent Creator',  'earned' => $streak >= 3],
    ['key' => 'verified',          'label' => 'Trusted Seller',      'earned' => (bool) $seller->is_verified],
    ['key' => 'hundred_followers', 'label' => '100 Followers',       'earned' => $seller->followers_count >= 100],
];

$tips = [];
$videosNoHashtags = $seller->videos()->where(function ($q) {
    $q->whereNull('hashtags')->orWhereRaw("hashtags::text = '[]'");
})->count();
if ($videosNoHashtags > 0) {
    $tips[] = "Add hashtags to your videos — {$videosNoHashtags} of your videos have none, and hashtags help new viewers discover you.";
}
if ($totalVideos > 0 && $seller->videos()->where('is_for_sale', false)->exists()) {
    $untagged = $seller->videos()->where('is_for_sale', false)->count();
    $tips[] = "Tag products in your videos — {$untagged} of your videos have no products tagged, so they can't drive direct sales.";
}
if ($streak === 0) {
    $tips[] = "Post today to start a streak — consistent posting is one of the strongest signals for the For You feed.";
}
if ($totalVideos > 0 && $totalVideos < 5) {
    $tips[] = "Keep going — creators who post 5+ videos see significantly more consistent reach.";
}
if (empty($tips)) {
    $tips[] = "You're doing great! Keep posting consistently and engaging with comments to maintain momentum.";
}

$gamification = [
    'level'         => $level,
    'xp'            => $xp,
    'xp_into_level' => $xp - $currentThreshold,
    'xp_for_level'  => max(1, $nextThreshold - $currentThreshold),
    'streak_days'   => $streak,
    'badges'        => $badges,
    'tips'          => array_slice($tips, 0, 3),
    'total_videos'  => $totalVideos,
];

return Inertia::render('Seller/Dashboard', compact(
    'stats', 'recentOrders', 'topProducts', 'recentVideos',
    'orders', 'savedProducts', 'savedVideos', 'gamification'
));

}

    /**
     * GET /seller/analytics — the Pro analytics dashboard.
     * Gated on active subscription; renders a locked/upsell version otherwise.
     */
    public function analytics(Request $request): Response
    {
        $seller = Auth::user();

        if (!$seller->hasActiveSubscription()) {
            return Inertia::render('Seller/Analytics', [
                'locked' => true,
            ]);
        }

        $period = (int) $request->input('period', 30); // 7, 30, 90, or 0 = all-time
        $periodStart = $period > 0 ? now()->subDays($period)->startOfDay() : Carbon::createFromTimestamp(0);
        $prevStart   = $period > 0 ? now()->subDays($period * 2)->startOfDay() : null;
        $prevEnd     = $period > 0 ? now()->subDays($period)->startOfDay() : null;

        $sellerId  = $seller->id;
        $videoIds  = $seller->videos()->pluck('id');

        // Revenue-bearing orders: paid_at set, not refunded. More accurate than
        // the ->paid() scope, which only matches status === 'paid' and misses
        // orders that have since moved on to confirmed/shipped/delivered.
        $revenueOrders = fn () => Order::forSeller($sellerId)
            ->whereNotNull('paid_at')
            ->where('status', '!=', 'refunded');

        // ── KPIs ────────────────────────────────────────────────────────────
        $revenueNow  = (clone $revenueOrders())->where('created_at', '>=', $periodStart)->sum(DB::raw('total - platform_fee'));
        $revenuePrev = $period > 0 ? (clone $revenueOrders())->whereBetween('created_at', [$prevStart, $prevEnd])->sum(DB::raw('total - platform_fee')) : 0;

        $ordersNow  = (clone $revenueOrders())->where('created_at', '>=', $periodStart)->count();
        $ordersPrev = $period > 0 ? (clone $revenueOrders())->whereBetween('created_at', [$prevStart, $prevEnd])->count() : 0;

        $aov = $ordersNow > 0 ? $revenueNow / $ordersNow : 0;

        $viewsNow  = VideoView::whereIn('video_id', $videoIds)->where('created_at', '>=', $periodStart)->count();
        $viewsPrev = $period > 0 ? VideoView::whereIn('video_id', $videoIds)->whereBetween('created_at', [$prevStart, $prevEnd])->count() : 0;

        $watchSecondsNow = VideoView::whereIn('video_id', $videoIds)->where('created_at', '>=', $periodStart)->sum('watch_seconds');

        $followersNow  = DB::table('follows')->where('following_id', $sellerId)->where('created_at', '>=', $periodStart)->count();
        $followersPrev = $period > 0 ? DB::table('follows')->where('following_id', $sellerId)->whereBetween('created_at', [$prevStart, $prevEnd])->count() : 0;

        $pctChange = fn ($cur, $prev) => $prev > 0 ? round((($cur - $prev) / $prev) * 100, 1) : ($cur > 0 ? 100.0 : 0.0);

        $kpis = [
            'revenue'                => round($revenueNow, 2),
            'revenue_change'         => $pctChange($revenueNow, $revenuePrev),
            'orders'                 => $ordersNow,
            'orders_change'          => $pctChange($ordersNow, $ordersPrev),
            'aov'                    => round($aov, 2),
            'views'                  => $viewsNow,
            'views_change'           => $pctChange($viewsNow, $viewsPrev),
            'watch_hours'            => round($watchSecondsNow / 3600, 1),
            'new_followers'          => $followersNow,
            'new_followers_change'   => $pctChange($followersNow, $followersPrev),
            'total_followers'        => $seller->followers_count,
            'views_to_orders_rate'   => $viewsNow > 0 ? round(($ordersNow / $viewsNow) * 100, 2) : 0,
        ];

        // ── Revenue trend (daily) ───────────────────────────────────────────
        $revenueTrend = (clone $revenueOrders())
            ->where('created_at', '>=', $periodStart)
            ->selectRaw('DATE(created_at) as date, SUM(total - platform_fee) as revenue, COUNT(*) as orders')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // ── Order status breakdown (this period, all statuses incl. pending) ─
        $statusBreakdown = Order::forSeller($sellerId)
            ->where('created_at', '>=', $periodStart)
            ->select('status', DB::raw('count(*) as total'), DB::raw('SUM(total) as revenue'))
            ->groupBy('status')
            ->get();

        // ── Follower growth ──────────────────────────────────────────────────
        // Reconstructed from currently-active `follows` rows' created_at.
        // Reflects when today's followers joined — won't capture churn from
        // people who followed and later unfollowed, since that row no longer
        // exists. Standard limitation, still an accurate "how you grew" view.
        $followerGrowth = DB::table('follows')
            ->where('following_id', $sellerId)
            ->where('created_at', '>=', $periodStart)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as new_followers')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // ── Retention (percent-bucket, real data from video_views.watch_percent) ─
        $retentionRow = VideoView::whereIn('video_id', $videoIds)
            ->where('created_at', '>=', $periodStart)
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN watch_percent >= 10 THEN 1 ELSE 0 END) as r10,
                SUM(CASE WHEN watch_percent >= 25 THEN 1 ELSE 0 END) as r25,
                SUM(CASE WHEN watch_percent >= 50 THEN 1 ELSE 0 END) as r50,
                SUM(CASE WHEN watch_percent >= 75 THEN 1 ELSE 0 END) as r75,
                SUM(CASE WHEN watch_percent >= 90 THEN 1 ELSE 0 END) as r90,
                SUM(CASE WHEN watch_percent >= 100 THEN 1 ELSE 0 END) as r100
            ')
            ->first();

        $totalViewsForRetention = (int) ($retentionRow->total ?? 0);
        $retention = collect([10, 25, 50, 75, 90, 100])->map(function ($t) use ($retentionRow, $totalViewsForRetention) {
            $reached = (int) ($retentionRow->{'r' . $t} ?? 0);
            return [
                'threshold' => $t,
                'pct' => $totalViewsForRetention > 0 ? round(($reached / $totalViewsForRetention) * 100, 1) : 0,
            ];
        })->values();

        // ── Audience split ──────────────────────────────────────────────────
        $audienceRow = VideoView::whereIn('video_id', $videoIds)
            ->where('created_at', '>=', $periodStart)
            ->selectRaw('
                COUNT(*) as total_views,
                COUNT(DISTINCT user_id) as unique_logged_in,
                SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as guest_views
            ')
            ->first();

        $audience = [
            'total_views'       => (int) ($audienceRow->total_views ?? 0),
            'unique_logged_in'  => (int) ($audienceRow->unique_logged_in ?? 0),
            'guest_views'       => (int) ($audienceRow->guest_views ?? 0),
        ];

        // ── Top videos (this period) ────────────────────────────────────────
        $watchStatsByVideo = VideoView::whereIn('video_id', $videoIds)
            ->where('created_at', '>=', $periodStart)
            ->select('video_id',
                DB::raw('AVG(watch_percent) as avg_watch_percent'),
                DB::raw('COUNT(*) as period_views'),
                DB::raw('SUM(watch_seconds) as total_watch_seconds'))
            ->groupBy('video_id')
            ->get()
            ->keyBy('video_id');

        $topVideos = Video::where('user_id', $sellerId)
            ->select('id', 'ulid', 'title', 'thumbnail_url', 'views_count', 'likes_count', 'comments_count', 'shares_count', 'saves_count', 'duration_seconds', 'published_at')
            ->orderByDesc('views_count')
            ->limit(6)
            ->get()
            ->map(function ($v) use ($watchStatsByVideo) {
                $w = $watchStatsByVideo->get($v->id);
                $v->period_views = (int) ($w->period_views ?? 0);
                $v->avg_watch_percent = round((float) ($w->avg_watch_percent ?? 0), 1);
                $v->total_watch_seconds = (int) ($w->total_watch_seconds ?? 0);
                return $v;
            });

        // ── Top products (this period, by revenue) ──────────────────────────
        $topProductRevenue = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.seller_id', $sellerId)
            ->whereNotNull('orders.paid_at')
            ->where('orders.status', '!=', 'refunded')
            ->where('orders.created_at', '>=', $periodStart)
            ->select('order_items.product_id', 'order_items.product_name',
                DB::raw('SUM(order_items.total) as revenue'),
                DB::raw('SUM(order_items.quantity) as units_sold'))
            ->groupBy('order_items.product_id', 'order_items.product_name')
            ->orderByDesc('revenue')
            ->limit(6)
            ->get();

        $productMeta = Product::whereIn('id', $topProductRevenue->pluck('product_id'))
            ->select('id', 'name', 'images', 'views_count', 'saves_count', 'orders_count')
            ->get()
            ->keyBy('id');

        $topProducts = $topProductRevenue->map(function ($row) use ($productMeta) {
            $p = $productMeta->get($row->product_id);
            return [
                'id'            => $row->product_id,
                'name'          => $row->product_name,
                'revenue'       => (float) $row->revenue,
                'units_sold'    => (int) $row->units_sold,
                'primary_image' => $p?->primary_image,
                'views_count'   => $p?->views_count ?? 0,
                'saves_count'   => $p?->saves_count ?? 0,
                'orders_count'  => $p?->orders_count ?? 0,
                'view_to_order_rate' => ($p && $p->views_count > 0) ? round(($p->orders_count / $p->views_count) * 100, 2) : 0,
            ];
        });

        // ── Best time to sell — day-of-week × hour heatmap ──────────────────
        $salesTiming = (clone $revenueOrders())
            ->where('created_at', '>=', $periodStart)
            ->selectRaw('EXTRACT(DOW FROM created_at) as dow, EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as orders, SUM(total - platform_fee) as revenue')
            ->groupBy('dow', 'hour')
            ->get();

        return Inertia::render('Seller/Analytics', [
            'locked'           => false,
            'period'           => $period,
            'kpis'             => $kpis,
            'revenueTrend'     => $revenueTrend,
            'statusBreakdown'  => $statusBreakdown,
            'followerGrowth'   => $followerGrowth,
            'retention'        => $retention,
            'audience'         => $audience,
            'topVideos'        => $topVideos,
            'topProducts'      => $topProducts,
            'salesTiming'      => $salesTiming,
        ]);
    }

    public function videos(): Response
    {
        $videos = Auth::user()->videos()
        ->with('user:id,username,name,avatar')
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
        $sellerId = Auth::id();

        $orders = Order::forSeller($sellerId)
            ->with('buyer:id,name,username,avatar')
            ->withCount('items')
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $statusCounts = Order::forSeller($sellerId)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('Seller/Orders', [
            'orders' => $orders,
            'stats' => $statusCounts,
        ]);
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
            'total_sales' => $seller->total_sales,
            'revenue_total' => $seller->revenue_total,
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
        $current = Order::forSeller($sellerId)->paid()->where('created_at', '>=', now()->subDays($days));
        $previous = Order::forSeller($sellerId)->paid()
            ->whereBetween('created_at', [now()->subDays($days * 2), now()->subDays($days)]);

        [$cur, $prev] = match ($metric) {
            'revenue' => [$current->sum('total'), $previous->sum('total')],
            default => [$current->count(), $previous->count()],
        };

        if ($prev == 0)
            return $cur > 0 ? 100 : 0;
        return round((($cur - $prev) / $prev) * 100, 1);
    }

    public function requestPayout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1000',
        ]);

        $seller = Auth::user();
        $balance = $seller->wallet_balance;
        $amt = (float) $validated['amount'];

        if ($amt > $balance) {
            return response()->json([
                'message' => "Insufficient balance. Your available balance is ₦" . number_format($balance, 2),
            ], 422);
        }

        $hasPending = \App\Models\Payout::where('seller_id', $seller->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPending) {
            return response()->json([
                'message' => 'You have a pending payout request. Wait for it to be processed before requesting another.',
            ], 422);
        }

        if (!$seller->paystack_recipient_code) {
            return response()->json([
                'message' => 'Please connect a bank account in Settings before requesting a payout.',
            ], 422);
        }

        $lastTx = \App\Models\WalletTransaction::where('user_id', $seller->id)->latest()->first();
        $balanceBefore = $lastTx?->balance_after ?? 0;

        \App\Models\WalletTransaction::create([
            'user_id' => $seller->id,
            'amount' => $amt,
            'type' => 'debit',
            'source' => 'payout',
            'description' => 'Payout withdrawal request',
            'balance_after' => $balanceBefore - $amt,
        ]);

        $payout = \App\Models\Payout::create([
            'seller_id' => $seller->id,
            'amount' => $amt,
            'status' => 'pending',
        ]);

        return response()->json($payout, 201);
    }


}