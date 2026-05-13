<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function dashboard(): Response
    {
        $stats = [
            'total_users'       => User::count(),
            'total_sellers'     => User::where('role', 'seller')->count(),
            'total_videos'      => Video::where('status', 'active')->count(),
            'gmv_30d'           => Order::paid()->where('created_at', '>=', now()->subDays(30))->sum('total'),
            'new_users_today'   => User::whereDate('created_at', today())->count(),
            'videos_today'      => Video::whereDate('created_at', today())->count(),
            'orders_today'      => Order::whereDate('created_at', today())->count(),
            'failed_video_jobs' => Video::where('status', 'failed')->count(),
            'queue_size'        => DB::table('jobs')->count(),
        ];

        $recentUsers   = User::latest()->limit(20)->get();
        $pendingVideos = Video::where('status', 'pending')
            ->with('user:id,name,username')
            ->latest()->limit(12)->get();
        $flaggedOrders = Order::whereIn('status', ['cancelled', 'refunded'])
            ->with(['buyer:id,name', 'seller:id,name'])
            ->latest()->limit(20)->get();

        return Inertia::render('Admin/Dashboard', compact('stats', 'recentUsers', 'pendingVideos', 'flaggedOrders'));
    }

    public function users(): Response
    {
        $users = User::latest()->paginate(50);
        return Inertia::render('Admin/Users', ['users' => $users]);
    }

    public function showUser(User $user): Response
    {
        $user->load(['videos', 'products', 'orders']);
        return Inertia::render('Admin/UserDetail', ['user' => $user]);
    }

    public function orders(): Response
    {
        $orders = Order::with(['buyer:id,name', 'seller:id,name'])->latest()->paginate(50);
        return Inertia::render('Admin/Orders', ['orders' => $orders]);
    }

    public function showOrder(Order $order): Response
    {
        $order->load(['buyer', 'seller', 'items.product']);
        return Inertia::render('Admin/OrderDetail', ['order' => $order]);
    }

    // ── API ───────────────────────────────────────────────────────────────────

    public function verifyUser(User $user): JsonResponse
    {
        $user->update(['is_verified' => true]);
        return response()->json(['message' => "User @{$user->username} verified."]);
    }

    public function suspendUser(User $user): JsonResponse
    {
        $user->update(['is_active' => !$user->is_active]);
        $action = $user->is_active ? 'unsuspended' : 'suspended';
        return response()->json(['message' => "User @{$user->username} {$action}."]);
    }

    public function approveVideo(Video $video): JsonResponse
    {
        $video->update(['status' => 'active', 'published_at' => now()]);
        return response()->json(['message' => 'Video approved and published.']);
    }

    public function rejectVideo(Request $request, Video $video): JsonResponse
    {
        $video->update(['status' => 'archived']);
        // Notify seller here
        return response()->json(['message' => 'Video rejected.']);
    }

    public function stats(): JsonResponse
    {
        return response()->json([
            'total_users'   => User::count(),
            'total_sellers' => User::where('role', 'seller')->count(),
            'total_orders'  => Order::count(),
            'total_revenue' => Order::paid()->sum('total'),
        ]);
    }
}
