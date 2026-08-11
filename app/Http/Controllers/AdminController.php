<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
   public function dashboard(): Response
{
    $stats = [
        'total_users'       => User::count(),
        'total_sellers'     => User::where('role', 'seller')->count(),
        'total_buyers'      => User::where('role', 'buyer')->count(),
        'deleted_users'     => User::onlyTrashed()->count(),           
        'pending_deletions' => User::onlyTrashed()                     
                                   ->whereNotNull('deletion_scheduled_at')
                                   ->where('deletion_scheduled_at', '>', now())
                                   ->count(),
        'total_videos'      => Video::where('status', 'active')->count(),
        'total_products'    => Product::where('status', 'active')->count(),
        'total_orders'      => Order::count(),
        'gmv_30d'           => Order::paid()->where('created_at', '>=', now()->subDays(30))->sum('total'),
        'gmv_7d'            => Order::paid()->where('created_at', '>=', now()->subDays(7))->sum('total'),
        'new_users_today'   => User::whereDate('created_at', today())->count(),
        'new_users_7d'      => User::where('created_at', '>=', now()->subDays(7))->count(),
        'videos_today'      => Video::whereDate('created_at', today())->count(),
        'orders_today'      => Order::whereDate('created_at', today())->count(),
        'pending_videos'    => Video::where('status', 'pending')->count(),
        'failed_video_jobs' => Video::where('status', 'failed')->count(),
        'queue_size'        => \DB::table('jobs')->count(),
        'revenue_total'     => Order::paid()->sum('total'),
    ];

    $recentUsers = User::latest()->limit(20)
        ->get(['id', 'name', 'username', 'avatar', 'role', 'is_verified', 'is_active', 'created_at']);

    $pendingVideos = Video::where('status', 'pending')
        ->with('user:id,name,username,avatar')
        ->latest()->limit(12)->get();

    $flaggedOrders = Order::whereIn('status', ['cancelled', 'refunded', 'disputed'])
        ->with(['buyer:id,name,username', 'seller:id,name,username'])
        ->latest()->limit(20)->get();

    $recentOrders = Order::with(['buyer:id,name,username', 'seller:id,name,username'])
        ->latest()->limit(10)->get();

    return Inertia::render('Admin/Dashboard', compact(
        'stats', 'recentUsers', 'pendingVideos', 'flaggedOrders', 'recentOrders'
    ));
}

   public function users(Request $request): Response
{
    // withTrashed() so deleted accounts are visible to admin
    $query = User::withTrashed()->latest();

    if ($request->filled('role')) {
        $query->where('role', $request->role);
    }

    if ($request->filled('status')) {
        match ($request->status) {
            'deleted'   => $query->onlyTrashed(),
            'suspended' => $query->whereNull('deleted_at')->where('is_active', false),
            'active'    => $query->whereNull('deleted_at')->where('is_active', true),
            default     => null,
        };
    }

    if ($request->filled('search')) {
        $q = $request->search;
        $query->where(function ($q2) use ($q) {
            $q2->where('name',         'ilike', "%{$q}%")
               ->orWhere('username',   'ilike', "%{$q}%")
               ->orWhere('email',      'ilike', "%{$q}%")
               // Search preserved values for deleted accounts
               ->orWhere('deleted_name',  'ilike', "%{$q}%")
               ->orWhere('deleted_email', 'ilike', "%{$q}%");
        });
    }

    $users = $query->paginate(50);

    return Inertia::render('Admin/Users', [
        'users'   => $users,
        'filters' => $request->only('role', 'search', 'status'),
    ]);
}

    public function showUser(User $user): Response
    {
        $user->load(['videos' => fn($q) => $q->latest()->limit(12), 'products' => fn($q) => $q->latest()->limit(12)]);
        $user->loadCount(['videos', 'products']);

        $orders = Order::where(fn($q) => $q->where('buyer_id', $user->id)->orWhere('seller_id', $user->id))
            ->with(['buyer:id,name,username', 'seller:id,name,username'])
            ->latest()->limit(20)->get();

        $totalSpent    = Order::where('buyer_id', $user->id)->paid()->sum('total');
        $totalEarned   = Order::where('seller_id', $user->id)->paid()->sum('total');
        $totalViews    = VideoView::whereIn('video_id', $user->videos()->pluck('id'))->count();

        return Inertia::render('Admin/UserDetail', [
            'user'         => $user,
            'orders'       => $orders,
            'totalSpent'   => $totalSpent,
            'totalEarned'  => $totalEarned,
            'totalViews'   => $totalViews,
        ]);
    }

    public function orders(Request $request): Response
    {
        $query = Order::with(['buyer:id,name,username', 'seller:id,name,username'])->latest();

        if ($request->filled('status')) $query->where('status', $request->status);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('reference', 'ilike', "%{$s}%");
        }

        $orders = $query->paginate(50);
        return Inertia::render('Admin/Orders', ['orders' => $orders, 'filters' => $request->only('status', 'search')]);
    }

    public function showOrder(Order $order): Response
    {
        $order->load(['buyer', 'seller', 'items.product']);
        return Inertia::render('Admin/OrderDetail', ['order' => $order]);
    }

    // ── API ───────────────────────────────────────────────────────────────────

    /** POST /api/admin/users/{user}/verify */
    public function verifyUser(User $user): JsonResponse
    {
        $user->update(['is_verified' => !$user->is_verified]);
        $action = $user->is_verified ? 'verified' : 'unverified';
        return response()->json(['message' => "User @{$user->username} {$action}.", 'is_verified' => $user->is_verified]);
    }

    /** POST /api/admin/users/{user}/suspend */
    public function suspendUser(User $user): JsonResponse
    {
        $user->update(['is_active' => !$user->is_active]);
        $action = $user->is_active ? 'unsuspended' : 'suspended';
        return response()->json(['message' => "User @{$user->username} {$action}.", 'is_active' => $user->is_active]);
    }

    /** POST /api/admin/users/{user}/role */
    public function changeRole(Request $request, User $user): JsonResponse
    {
        $request->validate(['role' => 'required|in:buyer,seller,admin']);
        $user->update(['role' => $request->role]);
        return response()->json(['message' => "Role updated to {$request->role}."]);
    }

    /** DELETE /api/admin/users/{user} */
  public function deleteUser(User $user): JsonResponse
{
    // Preserve for fraud reference before soft delete
    $user->update([
        'deleted_name'  => $user->name,
        'deleted_email' => $user->email,
        'is_active'     => false,
    ]);

    $user->delete(); 

    return response()->json(['message' => "User @{$user->username} deleted."]);
}
    /** POST /api/admin/videos/{video}/approve */
    public function approveVideo(Video $video): JsonResponse
    {
        $video->update(['status' => 'active', 'published_at' => now()]);
        return response()->json(['message' => 'Video approved and published.']);
    }

    /** POST /api/admin/videos/{video}/reject */
    public function rejectVideo(Request $request, Video $video): JsonResponse
    {
        
        $request->validate(['reason' => 'required|string|max:500']);
        $video->update(['status' => 'archived']);
        // notify seller — e.g. $video->user->notify(new VideoRejectedNotification($request->reason));
        return response()->json(['message' => 'Video rejected.', 'reason' => $request->reason]);
    }



    /** POST /api/admin/videos/{video}/feature */
    public function featureVideo(Video $video): JsonResponse
    {
        // Add a "is_featured" flag to boost in feed algorithm
        $video->update(['is_featured' => !($video->is_featured ?? false)]);
        $action = $video->is_featured ? 'featured' : 'unfeatured';
        return response()->json(['message' => "Video {$action}."]);
    }

    /**
     * POST /api/admin/orders/{order}/refund
     *
     * Now reverses the seller's wallet credit when the order had been paid —
     * previously this only flipped the status, letting the seller keep funds
     * for an order marked refunded. See Order::reverseSellerCredit().
     */
    public function refundOrder(Order $order): JsonResponse
    {
        DB::transaction(function () use ($order) {
            $order->update(['status' => 'refunded']);
            $order->reverseSellerCredit("Order {$order->reference} refunded by admin");
        });

        return response()->json(['message' => "Order {$order->reference} marked as refunded and seller balance adjusted."]);
    }

    /** POST /api/admin/orders/{order}/resolve */
    public function resolveOrder(Order $order): JsonResponse
{
    $updates = ['status' => 'delivered'];
    if (!$order->delivered_at) {
        $updates['delivered_at'] = now();
    }
    $order->update($updates);
    return response()->json(['message' => "Order {$order->reference} resolved."]);
}

    /** GET /api/admin/stats */
    public function stats(): JsonResponse
    {
        return response()->json([
            'total_users'    => User::count(),
            'total_sellers'  => User::where('role', 'seller')->count(),
            'total_orders'   => Order::count(),
            'total_revenue'  => Order::paid()->sum('total'),
            'pending_videos' => Video::where('status', 'pending')->count(),
            'queue_size'     => DB::table('jobs')->count(),
        ]);
    }

    /** GET /api/admin/analytics */
    public function analytics(): JsonResponse
    {
        // Revenue by day for last 30 days
        $revenueByDay = Order::paid()
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Top sellers by revenue
        $topSellers = User::where('role', 'seller')
            ->withSum(['sellerOrders as revenue' => fn($q) => $q->paid()], 'total')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get(['id', 'name', 'username', 'avatar']);

        // Top products by orders
        $topProducts = Product::withCount('orderItems')
            ->orderByDesc('order_items_count')
            ->limit(10)
            ->get(['id', 'name', 'price', 'images']);

        // User growth by day
        $userGrowth = User::where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as users')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json(compact('revenueByDay', 'topSellers', 'topProducts', 'userGrowth'));
    }

public function approvePayout(
    \App\Models\Payout $payout,
    \App\Services\PaystackService $paystack,
): JsonResponse {
    if ($payout->status !== 'pending') {
        return response()->json(['message' => 'This payout is not pending.'], 422);
    }

    $seller = $payout->seller;

    if (!$seller->paystack_recipient_code) {
        return response()->json(['message' => 'Seller has no Paystack recipient code. They need to reconnect their bank.'], 422);
    }

    // ── TEMPORARY: Mock transfer for Starter Business accounts ──────────────
    // Paystack Starter Business accounts cannot initiate third-party transfers.
    // This bypasses the actual transfer and marks the payout as paid for testing.
    // TODO: Remove this block and uncomment the real transfer below once your
    //       Paystack account is upgraded to Registered Business.
    // ────────────────────────────────────────────────────────────────────────
    $payout->update([
        'status'    => 'paid',
        'reference' => 'TEST-FLK-PAY-' . $payout->id . '-' . now()->timestamp,
        'paid_at'   => now(),
    ]);

    try {
        $seller->notify(new \App\Notifications\PayoutProcessedNotification($payout));
    } catch (\Throwable) {}

    return response()->json([
        'message' => "₦" . number_format($payout->amount, 2) . " payout to {$seller->account_name} approved (test mode — no real transfer made).",
    ]);

    // ── REAL TRANSFER (uncomment when Paystack account is upgraded) ──────────
    /*
    try {
        $transfer = $paystack->initiateTransfer(
            recipientCode: $seller->paystack_recipient_code,
            amount:        $payout->amount,
            reason:        "Flockr payout to @{$seller->username}",
            reference:     'FLK-PAY-' . $payout->id,
        );

        $payout->update([
            'status'    => 'paid',
            'reference' => $transfer['reference'] ?? null,
            'paid_at'   => now(),
        ]);

        try {
            $seller->notify(new \App\Notifications\PayoutProcessedNotification($payout));
        } catch (\Throwable) {}

        return response()->json([
            'message'  => "₦" . number_format($payout->amount, 2) . " sent to {$seller->account_name}.",
            'transfer' => $transfer,
        ]);

    } catch (\Throwable $e) {
        // Re-credit wallet if transfer fails
        $lastTx        = \App\Models\WalletTransaction::where('user_id', $seller->id)->latest()->first();
        $balanceBefore = $lastTx?->balance_after ?? 0;

        \App\Models\WalletTransaction::create([
            'user_id'       => $seller->id,
            'amount'        => $payout->amount,
            'type'          => 'credit',
            'source'        => 'payout_reversal',
            'description'   => 'Payout failed — funds returned to wallet',
            'balance_after' => $balanceBefore + $payout->amount,
        ]);

        $payout->update(['status' => 'failed']);

        return response()->json(['message' => 'Transfer failed: ' . $e->getMessage()], 500);
    }
    */
}
    public function videos(Request $request): Response
{
    $query = Video::with('user:id,name,username,avatar')->latest();
 
    if ($request->filled('status')) $query->where('status', $request->status);
    if ($request->filled('search')) {
        $s = $request->search;
        $query->where(fn($q) => $q->where('title', 'ilike', "%{$s}%")
            ->orWhereHas('user', fn($q2) => $q2->where('username', 'ilike', "%{$s}%")));
    }
 
    $videos = $query->withCount(['likes', 'comments'])->paginate(24);
 
    return Inertia::render('Admin/Videos', [
        'videos'  => $videos,
        'filters' => $request->only('status', 'search'),
    ]);
}
 
public function payouts(Request $request): Response
{
    $query = \App\Models\Payout::with('seller:id,name,username,avatar,bank_name,account_last4,account_name,paystack_recipient_code')->latest();
 
    if ($request->filled('status')) $query->where('status', $request->status);
    if ($request->filled('search')) {
        $s = $request->search;
        $query->whereHas('seller', fn($q) => $q->where('username', 'ilike', "%{$s}%")->orWhere('name', 'ilike', "%{$s}%"));
    }
 
    $payouts = $query->paginate(30);
 
    $stats = [
        'pending_count'    => \App\Models\Payout::where('status', 'pending')->count(),
        'pending_amount'   => \App\Models\Payout::where('status', 'pending')->sum('amount'),
        'paid_count_30d'   => \App\Models\Payout::where('status', 'paid')->where('created_at', '>=', now()->subDays(30))->count(),
        'paid_amount_30d'  => \App\Models\Payout::where('status', 'paid')->where('created_at', '>=', now()->subDays(30))->sum('amount'),
    ];
 
    return Inertia::render('Admin/Payouts', [
        'payouts' => $payouts,
        'filters' => $request->only('status', 'search'),
        'stats'   => $stats,
    ]);
}
 
public function reports(Request $request): Response
{
    $query = \App\Models\Report::with([
        'reporter:id,name,username,avatar',
        'reported:id,name,username,avatar,role',
        'conversation',
    ]);

    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    match ($request->input('type', '')) {
        'video' => $query->where('reason', 'like', '[Video:%'),
        'chat'  => $query->whereNotNull('conversation_id'),
        'order' => $query->whereNotNull('order_id'),
        'user'  => $query->where(function ($q) {
            $q->whereNull('conversation_id')
              ->whereNull('order_id')
              ->where('reason', 'not like', '[Video:%');
        }),
        default => null,
    };

    match ($request->input('sort', 'latest')) {
        'oldest' => $query->oldest('updated_at'),
        'az'     => $query->join('users as ru', 'reports.reported_id', '=', 'ru.id')
                          ->orderBy('ru.username')->select('reports.*'),
        'za'     => $query->join('users as ru', 'reports.reported_id', '=', 'ru.id')
                          ->orderByDesc('ru.username')->select('reports.*'),
        default  => $query->latest('updated_at'), // updated_at so re-reported bubble up
    };

    return Inertia::render('Admin/Reports', [
        'reports' => $query->paginate(30),
        'filters' => [
            'status' => $request->input('status', ''),
            'sort'   => $request->input('sort', 'latest'),
            'type'   => $request->input('type', ''),
        ],
    ]);
}
public function analyticsPage(): Response
{
    return Inertia::render('Admin/Analytics');
}
 
// ── API methods to ADD ────────────────────────────────────────────────────────
 
/** PATCH /api/admin/orders/{order}/status */
public function updateOrderStatus(Request $request, Order $order): JsonResponse
{
    $request->validate(['status' => 'required|in:confirmed,processing,shipped,delivered,cancelled,refunded']);
    
    $updates = ['status' => $request->status];
    if ($request->status === 'delivered' && !$order->delivered_at) {
        $updates['delivered_at'] = now();
    }
    
    $order->update($updates);

    // If an admin manually flips a paid order to cancelled/refunded from here,
    // reverse the seller credit the same way the dedicated refund endpoint does.
    if (in_array($request->status, ['cancelled', 'refunded'])) {
        $order->reverseSellerCredit("Order {$order->reference} marked {$request->status} by admin");
    }

    return response()->json(['message' => "Order marked as {$request->status}.", 'status' => $order->status]);
}
 
/** POST /api/admin/reports/{report}/actioned */
public function actionReport(\App\Models\Report $report): JsonResponse
{
    $report->update(['status' => 'actioned']);
    return response()->json(['message' => 'Report marked as actioned.']);
}
 
/** POST /api/admin/reports/{report}/dismissed */
public function dismissReport(\App\Models\Report $report): JsonResponse
{
    $report->update(['status' => 'dismissed']);
    return response()->json(['message' => 'Report dismissed.']);
}

public function conversationMessages(\App\Models\Conversation $conversation): JsonResponse
{
    $messages = $conversation->messages()
        ->with('sender:id,name,username,avatar')
        ->orderBy('created_at', 'asc')
        ->get();
 
    return response()->json($messages);
}
}