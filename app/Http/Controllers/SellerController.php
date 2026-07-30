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
use Illuminate\Http\Request;

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
            ->limit(8)
            ->get();

        $topProducts = $seller->products()
            ->withCount('orderItems')
            ->orderByDesc('order_items_count')  // ← withCount alias is order_items_count not orders_count
            ->limit(5)
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

// Upload streak — consecutive days (from today backward) with at least one published video
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

        // 1. Check sufficient balance
        if ($amt > $balance) {
            return response()->json([
                'message' => "Insufficient balance. Your available balance is ₦" . number_format($balance, 2),
            ], 422);
        }

        // 2. Block duplicate pending requests
        $hasPending = \App\Models\Payout::where('seller_id', $seller->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPending) {
            return response()->json([
                'message' => 'You have a pending payout request. Wait for it to be processed before requesting another.',
            ], 422);
        }

        // 3. Check seller has a bank account connected
        if (!$seller->paystack_recipient_code) {
            return response()->json([
                'message' => 'Please connect a bank account in Settings before requesting a payout.',
            ], 422);
        }

        // 4. Debit wallet immediately so balance updates
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

        // 5. Create payout record
        $payout = \App\Models\Payout::create([
            'seller_id' => $seller->id,
            'amount' => $amt,
            'status' => 'pending',
        ]);

        return response()->json($payout, 201);
    }


}
