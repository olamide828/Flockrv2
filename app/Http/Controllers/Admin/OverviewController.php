<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Video;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Admin overview: dashboard numbers, analytics, nav badges and global search.
 * Read-only — nothing here moves money. Money = Order::revenue() with seller_earning / flockr_fee.
 */
class OverviewController extends Controller
{
    /** Flockr earns the sales commission (platform_fee) PLUS its small delivery fee (flockr_fee). */
    private const FEE   = '(COALESCE(platform_fee, 0) + COALESCE(flockr_fee, 0))';
    private const GOODS = 'COALESCE(subtotal, 0)';

    /** Fill a date→value map so charts get one point per day. */
    private function daily($rows, int $days, array $cols): array
    {
        $by  = collect($rows)->keyBy(fn ($r) => (string) $r->date);
        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d   = Carbon::today()->subDays($i);
            $key = $d->toDateString();
            $row = ['date' => $key, 'label' => $d->format('j M')];
            foreach ($cols as $c) $row[$c] = (float) ($by[$key]->$c ?? 0);
            $out[] = $row;
        }
        return $out;
    }

    private function pct(float $now, float $prev): ?float
    {
        if ($prev <= 0) return $now > 0 ? 100.0 : null;
        return round((($now - $prev) / $prev) * 100, 1);
    }

    /** GET /api/admin/overview */
    public function overview(): JsonResponse
    {
        $days = 30;
        $from = Carbon::today()->subDays($days - 1);
        $prevFrom = Carbon::today()->subDays($days * 2 - 1);

        $rev = fn () => Order::revenue();

        $series = $this->daily(
            $rev()->where('created_at', '>=', $from)
                ->selectRaw('DATE(created_at) as date, SUM(' . self::GOODS . ') as gmv, SUM(' . self::FEE . ') as fees, COUNT(*) as orders')
                ->groupBy('date')->get(),
            $days, ['gmv', 'fees', 'orders']
        );

        $signups = $this->daily(
            User::where('created_at', '>=', $from)->selectRaw('DATE(created_at) as date, COUNT(*) as users')->groupBy('date')->get(),
            $days, ['users']
        );

        $gmvNow  = (float) $rev()->where('created_at', '>=', $from)->sum(DB::raw(self::GOODS));
        $gmvPrev = (float) $rev()->whereBetween('created_at', [$prevFrom, $from])->sum(DB::raw(self::GOODS));
        $feeNow  = (float) $rev()->where('created_at', '>=', $from)->sum(DB::raw(self::FEE));
        $feePrev = (float) $rev()->whereBetween('created_at', [$prevFrom, $from])->sum(DB::raw(self::FEE));
        $ordNow  = $rev()->where('created_at', '>=', $from)->count();
        $ordPrev = $rev()->whereBetween('created_at', [$prevFrom, $from])->count();
        $usrNow  = User::where('created_at', '>=', $from)->count();
        $usrPrev = User::whereBetween('created_at', [$prevFrom, $from])->count();

        $commission  = (float) $rev()->where('created_at', '>=', $from)->sum(DB::raw('COALESCE(platform_fee, 0)'));
        $deliveryFee = (float) $rev()->where('created_at', '>=', $from)->sum(DB::raw('COALESCE(flockr_fee, 0)'));
        $courierFees = (float) $rev()->where('created_at', '>=', $from)->sum(DB::raw('COALESCE(NULLIF(courier_fee, 0), shipping_fee, 0)'));

        $escrow = (float) Order::inEscrow()->sum(DB::raw('COALESCE(seller_earning, subtotal - platform_fee, 0)'));

        $stats = [
            'gmv'          => $gmvNow,   'gmv_change'    => $this->pct($gmvNow, $gmvPrev),
            'fees'         => $feeNow,   'fees_change'   => $this->pct($feeNow, $feePrev),
            'orders'       => $ordNow,   'orders_change' => $this->pct($ordNow, $ordPrev),
            'new_users'    => $usrNow,   'users_change'  => $this->pct($usrNow, $usrPrev),
            'escrow'       => $escrow,
            'commission'   => $commission,    // 5% (Pro 3%) taken from sellers
            'delivery_fee' => $deliveryFee,   // Flockr's own delivery fee
            'courier_fees' => $courierFees,   // paid by buyers, passed to the courier (not Flockr income)
            'total_users'  => User::count(),
            'sellers'      => User::where('role', 'seller')->count(),
            'live_videos'  => Video::where('status', 'active')->count(),
            'live_products'=> Product::where('status', 'active')->count(),
            'orders_today' => Order::whereDate('created_at', today())->count(),
            'users_today'  => User::whereDate('created_at', today())->count(),
        ];

        $recent = Order::with(['buyer:id,name,username,avatar', 'seller:id,name,username,avatar', 'items.product:id,name,images'])
            ->latest()->limit(8)
            ->get(['id', 'reference', 'buyer_id', 'seller_id', 'status', 'total', 'created_at']);

        $recentAdmin = Schema::hasTable('admin_audit_logs')
            ? \App\Models\AdminAuditLog::with('admin:id,name,username')->latest()->limit(8)->get()
            : [];

        return response()->json([
            'stats'    => $stats,
            'series'   => $series,
            'signups'  => $signups,
            'attention'=> $this->attention(),
            'recent_orders' => $recent,
            'recent_activity' => $recentAdmin,
        ]);
    }

    /** Things an admin should act on, with the page to go to. */
    private function attention(): array
    {
        $c = $this->counts();
        $items = [
            ['key' => 'disputes', 'label' => 'Disputes waiting for you', 'count' => $c['disputes'], 'href' => '/admin/disputes', 'tone' => 'bad'],
            ['key' => 'payouts',  'label' => 'Payouts to approve',        'count' => $c['payouts'],  'href' => '/admin/payouts',  'tone' => 'warn'],
            ['key' => 'refunds',  'label' => 'Refunds that failed',       'count' => $c['refunds_failed'], 'href' => '/admin/orders?refund=failed', 'tone' => 'bad'],
            ['key' => 'reports',  'label' => 'Open reports',              'count' => $c['reports'],  'href' => '/admin/reports',  'tone' => 'warn'],
            ['key' => 'tickets',  'label' => 'Support tickets',           'count' => $c['tickets'],  'href' => '/admin/support',  'tone' => 'warn'],
            ['key' => 'videos',   'label' => 'Videos pending review',     'count' => $c['videos'],   'href' => '/admin/videos?status=pending', 'tone' => 'info'],
            ['key' => 'claims',   'label' => 'Copyright claims open',     'count' => $c['claims'],   'href' => '/admin/music',    'tone' => 'warn'],
            ['key' => 'flagged',  'label' => 'Flagged sellers',           'count' => $c['flagged'],  'href' => '/admin/flagged-sellers', 'tone' => 'warn'],
            ['key' => 'failed_jobs', 'label' => 'Failed background jobs', 'count' => $c['failed_jobs'], 'href' => '/admin/system', 'tone' => 'bad'],
        ];
        return array_values(array_filter($items, fn ($i) => $i['count'] > 0));
    }

    private function safe(callable $f): int
    {
        try { return (int) $f(); } catch (\Throwable) { return 0; }
    }

    private function counts(): array
    {
        return [
            'orders'   => $this->safe(fn () => Order::whereIn('status', ['paid', 'confirmed', 'pickup_failed'])->count()),
            'disputes' => $this->safe(fn () => Schema::hasTable('disputes') ? DB::table('disputes')->whereIn('status', ['open', 'awaiting_admin'])->count() : 0),
            'payouts'  => $this->safe(fn () => Schema::hasTable('payouts') ? DB::table('payouts')->where('status', 'pending')->count() : 0),
            'reports'  => $this->safe(fn () => Schema::hasTable('reports') ? DB::table('reports')->where('status', 'pending')->count() : 0),
            'tickets'  => $this->safe(fn () => Schema::hasTable('support_tickets') ? DB::table('support_tickets')->where('status', '!=', 'resolved')->count() : 0),
            'flagged'  => $this->safe(fn () => Schema::hasColumn('users', 'is_flagged_for_review') ? User::where('is_flagged_for_review', true)->count() : 0),
            'claims'   => $this->safe(fn () => Schema::hasTable('copyright_claims') ? DB::table('copyright_claims')->where('status', 'open')->count() : 0),
            'videos'   => $this->safe(fn () => Video::where('status', 'pending')->count()),
            'failed_jobs' => $this->safe(fn () => Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0),
            'refunds_failed' => $this->safe(fn () => Schema::hasColumn('orders', 'refund_status') ? Order::where('refund_status', 'failed')->count() : 0),
        ];
    }

    /** GET /api/admin/badges — numbers for the sidebar. */
    public function badges(): JsonResponse
    {
        return response()->json($this->counts());
    }

    /** GET /api/admin/overview/analytics?days=30 */
    public function analytics(Request $request): JsonResponse
    {
        $days = in_array((int) $request->input('days'), [7, 30, 90], true) ? (int) $request->input('days') : 30;
        $from = Carbon::today()->subDays($days - 1);
        $rev  = fn () => Order::revenue()->where('created_at', '>=', $from);

        $series = $this->daily(
            $rev()->selectRaw('DATE(created_at) as date, SUM(' . self::GOODS . ') as gmv, SUM(' . self::FEE . ') as fees, COUNT(*) as orders')
                ->groupBy('date')->get(),
            $days, ['gmv', 'fees', 'orders']
        );
        $signups = $this->daily(
            User::where('created_at', '>=', $from)
                ->selectRaw("DATE(created_at) as date, COUNT(*) as users, SUM(CASE WHEN role = 'seller' THEN 1 ELSE 0 END) as sellers")
                ->groupBy('date')->get(),
            $days, ['users', 'sellers']
        );

        $topSellers = Order::revenue()->where('orders.created_at', '>=', $from)
            ->join('users', 'users.id', '=', 'orders.seller_id')
            ->groupBy('users.id', 'users.name', 'users.username')
            ->selectRaw('users.id, users.name, users.username, SUM(' . self::GOODS . ') as gmv, COUNT(*) as orders')
            ->orderByDesc('gmv')->limit(8)->get();

        $topProducts = [];
        if (Schema::hasTable('order_items')) {
            $topProducts = DB::table('order_items')
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->whereNotNull('orders.paid_at')->whereNotIn('orders.status', ['cancelled', 'refunded', 'pending'])
                ->whereNull('orders.deleted_at')->where('orders.created_at', '>=', $from)
                ->groupBy('order_items.product_name')
                ->selectRaw('order_items.product_name as name, SUM(order_items.quantity) as units, SUM(order_items.total) as gmv')
                ->orderByDesc('gmv')->limit(8)->get();
        }

        $statusMix = Order::where('created_at', '>=', $from)
            ->select('status', DB::raw('COUNT(*) as n'))->groupBy('status')->pluck('n', 'status');

        $created   = Order::where('created_at', '>=', $from)->count();
        $paid      = Order::where('created_at', '>=', $from)->whereNotNull('paid_at')->count();
        $shipped   = Order::where('created_at', '>=', $from)->whereNotNull('shipped_at')->count();
        $delivered = Order::where('created_at', '>=', $from)->whereNotNull('delivered_at')->count();
        $released  = Order::where('created_at', '>=', $from)->whereNotNull('escrow_released_at')->count();

        // Day-of-week × hour (Lagos time = UTC+1). DOW: 0 = Sunday.
        $heat = array_fill(0, 7, array_fill(0, 24, 0));
        Order::revenue()->where('created_at', '>=', $from)
            ->selectRaw("EXTRACT(DOW FROM created_at + interval '1 hour')::int as dow, EXTRACT(HOUR FROM created_at + interval '1 hour')::int as hr, COUNT(*) as n")
            ->groupBy('dow', 'hr')->get()
            ->each(function ($r) use (&$heat) { $heat[(int) $r->dow][(int) $r->hr] = (int) $r->n; });
        // Reorder Mon..Sun
        $heat = [$heat[1], $heat[2], $heat[3], $heat[4], $heat[5], $heat[6], $heat[0]];

        $totals = [
            'gmv'    => (float) $rev()->sum(DB::raw(self::GOODS)),
            'fees'   => (float) $rev()->sum(DB::raw(self::FEE)),
            'orders' => $rev()->count(),
            'aov'    => (float) ($rev()->count() ? $rev()->sum(DB::raw(self::GOODS)) / max(1, $rev()->count()) : 0),
            'new_users' => User::where('created_at', '>=', $from)->count(),
            'cancel_rate' => $created ? round(Order::where('created_at', '>=', $from)->whereIn('status', ['cancelled', 'refunded'])->count() / $created * 100, 1) : 0,
        ];

        return response()->json([
            'days' => $days, 'totals' => $totals, 'series' => $series, 'signups' => $signups,
            'top_sellers' => $topSellers, 'top_products' => $topProducts, 'status_mix' => $statusMix,
            'funnel' => [
                ['label' => 'Orders started', 'value' => $created], ['label' => 'Paid', 'value' => $paid],
                ['label' => 'Picked up', 'value' => $shipped], ['label' => 'Delivered', 'value' => $delivered],
                ['label' => 'Paid out to seller', 'value' => $released],
            ],
            'heatmap' => $heat,
        ]);
    }

    /** GET /api/admin/search?q= */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->input('q'));
        if (mb_strlen($q) < 2) return response()->json(['results' => []]);
        $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $q) . '%';
        $out  = [];

        $users = User::withTrashed()
            ->where(fn ($w) => $w->where('username', 'ilike', $like)->orWhere('name', 'ilike', $like)->orWhere('email', 'ilike', $like))
            ->limit(6)->get(['id', 'name', 'username', 'email', 'role']);
        foreach ($users as $u) $out[] = ['type' => 'User', 'label' => $u->name, 'sub' => '@' . $u->username . ' · ' . $u->role, 'href' => '/admin/users/' . $u->id];

        $orders = Order::where('reference', 'ilike', $like)->limit(6)->get(['id', 'reference', 'status', 'total']);
        foreach ($orders as $o) $out[] = ['type' => 'Order', 'label' => $o->reference, 'sub' => $o->status . ' · ₦' . number_format((float) $o->total), 'href' => '/admin/orders/' . $o->id];

        $products = Product::where('name', 'ilike', $like)->limit(5)->get(['id', 'name', 'slug', 'status']);
        foreach ($products as $p) $out[] = ['type' => 'Product', 'label' => $p->name, 'sub' => $p->status, 'href' => '/admin/products?search=' . urlencode($p->name)];

        $videos = Video::where('title', 'ilike', $like)->limit(5)->get(['id', 'title', 'status']);
        foreach ($videos as $v) $out[] = ['type' => 'Video', 'label' => $v->title ?: 'Untitled video', 'sub' => $v->status, 'href' => '/admin/videos?search=' . urlencode((string) $v->title)];

        return response()->json(['results' => $out]);
    }
}
