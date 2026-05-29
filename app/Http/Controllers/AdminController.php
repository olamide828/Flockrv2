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
            'queue_size'        => DB::table('jobs')->count(),
            'revenue_total'     => Order::paid()->sum('total'),
        ];

        $recentUsers = User::latest()->limit(20)
            ->get(['id', 'name', 'username', 'avatar', 'role', 'is_verified', 'is_active', 'created_at']);

        $pendingVideos = Video::where('status', 'pending')
            ->with('user:id,name,username,avatar')
            ->latest()
            ->limit(12)
            ->get();

        $flaggedOrders = Order::whereIn('status', ['cancelled', 'refunded', 'disputed'])
            ->with(['buyer:id,name,username', 'seller:id,name,username'])
            ->latest()
            ->limit(20)
            ->get();

        $recentOrders = Order::with(['buyer:id,name,username', 'seller:id,name,username'])
            ->latest()
            ->limit(10)
            ->get();

        return Inertia::render('Admin/Dashboard', compact(
            'stats', 'recentUsers', 'pendingVideos', 'flaggedOrders', 'recentOrders'
        ));
    }

    public function users(Request $request): Response
    {
        $query = User::latest();

        if ($request->filled('role'))   $query->where('role', $request->role);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($q2) => $q2->where('name', 'ilike', "%{$q}%")->orWhere('username', 'ilike', "%{$q}%")->orWhere('email', 'ilike', "%{$q}%"));
        }

        $users = $query->paginate(50);
        return Inertia::render('Admin/Users', ['users' => $users, 'filters' => $request->only('role', 'search')]);
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

    /** POST /api/admin/orders/{order}/refund */
    public function refundOrder(Order $order): JsonResponse
    {
        $order->update(['status' => 'refunded']);
        return response()->json(['message' => "Order {$order->reference} marked as refunded."]);
    }

    /** POST /api/admin/orders/{order}/resolve */
    public function resolveOrder(Order $order): JsonResponse
    {
        $order->update(['status' => 'delivered']);
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
    }
}