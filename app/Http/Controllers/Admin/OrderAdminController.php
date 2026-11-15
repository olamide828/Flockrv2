<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\OrderController;
use App\Models\AdminAuditLog;
use App\Models\Order;
use App\Models\WalletTransaction;
use App\Services\RefundService;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderAdminController extends Controller
{
    private const GROUPS = [
        'todo'      => ['paid', 'confirmed', 'pickup_failed'],
        'transit'   => ['processing', 'ready_for_pickup', 'shipped', 'in_transit'],
        'delivered' => ['delivered'],
        'issues'    => ['delivery_failed', 'disputed', 'returned'],
        'closed'    => ['cancelled', 'refunded'],
        'pending'   => ['pending'],
    ];

    /** GET /api/admin/orders */
    public function index(Request $request): JsonResponse
    {
        $q = Order::with(['buyer:id,name,username,avatar', 'seller:id,name,username,avatar'])->withCount('items')->latest();

        $tab = $request->input('tab', 'all');
        if (isset(self::GROUPS[$tab])) $q->whereIn('status', self::GROUPS[$tab]);
        if ($request->filled('status') && $request->status !== 'all') $q->where('status', $request->status);

        if ($request->boolean('refund_failed')) $q->where('refund_status', 'failed');
        if ($request->input('escrow') === 'held') $q->inEscrow();
        if ($request->input('escrow') === 'released') $q->whereNotNull('escrow_released_at');

        if ($request->filled('from')) $q->whereDate('created_at', '>=', $request->from);
        if ($request->filled('to'))   $q->whereDate('created_at', '<=', $request->to);

        if ($request->filled('search')) {
            $s = trim($request->search);
            $q->where(function ($w) use ($s) {
                $w->where('reference', 'ilike', "%{$s}%")
                  ->orWhere('tracking_number', 'ilike', "%{$s}%")
                  ->orWhereHas('buyer', fn ($u) => $u->where('name', 'ilike', "%{$s}%")->orWhere('username', 'ilike', "%{$s}%")->orWhere('email', 'ilike', "%{$s}%"))
                  ->orWhereHas('seller', fn ($u) => $u->where('name', 'ilike', "%{$s}%")->orWhere('username', 'ilike', "%{$s}%"));
            });
        }

        $counts = ['all' => Order::count()];
        foreach (self::GROUPS as $k => $st) $counts[$k] = Order::whereIn('status', $st)->count();

        return response()->json([
            'rows'   => $q->paginate(30)->withQueryString(),
            'counts' => $counts,
            'stats'  => [
                'gmv_30d'        => (float) Order::revenue()->where('created_at', '>=', now()->subDays(30))->sum('total'),
                'in_escrow'      => (float) Order::inEscrow()->sum(DB::raw('COALESCE(seller_earning, subtotal - platform_fee)')),
                'refund_failed'  => Order::where('refund_status', 'failed')->count(),
                'flockr_fees_30d'=> (float) Order::revenue()->where('created_at', '>=', now()->subDays(30))->sum(DB::raw('COALESCE(flockr_fee, platform_fee)')),
            ],
        ]);
    }

    /** GET /api/admin/orders/{orderId} */
    public function show(int $orderId): JsonResponse
    {
        $order = Order::withTrashed()->with([
            'buyer:id,name,username,avatar,email,phone', 'seller:id,name,username,avatar,email,phone',
            'items.product:id,name,slug,images',
            'dispute:id,order_id,status,reason,created_at',
        ])->findOrFail($orderId);

        $wallet = WalletTransaction::where('order_id', $order->id)->orderBy('id')->get(['id', 'user_id', 'type', 'amount', 'source', 'description', 'balance_after', 'created_at']);

        $notes = AdminAuditLog::with('admin:id,name')->where('target_type', 'order')->where('target_id', $order->id)
            ->latest()->limit(50)->get()
            ->map(fn ($l) => [
                'id' => $l->id, 'action' => $l->action, 'admin' => $l->admin?->name ?? 'System',
                'note' => $l->meta['note'] ?? null, 'meta' => $l->meta, 'created_at' => $l->created_at,
            ]);

        $releaseAt = $order->status === 'delivered' && !$order->escrow_released_at && $order->delivered_at
            ? $order->delivered_at->copy()->addDays(3) : null;

        $payTotal = (float) ($order->payment_total ?? $order->total);
        $timeline = array_values(array_filter([
            ['title' => 'Order placed', 'at' => $order->created_at],
            $order->paid_at ? ['title' => 'Payment received', 'at' => $order->paid_at, 'sub' => '₦' . number_format($payTotal, 2) . ' · ' . $order->paystack_reference] : null,
            $order->terminal_shipment_id ? ['title' => 'Courier booked', 'at' => $order->paid_at, 'sub' => trim(($order->courier_name ?? '') . ' ' . ($order->tracking_number ?? ''))] : null,
            $order->shipped_at ? ['title' => 'Picked up', 'at' => $order->shipped_at] : null,
            $order->delivered_at ? ['title' => 'Delivered', 'at' => $order->delivered_at] : null,
            $order->escrow_released_at ? ['title' => 'Escrow released to seller', 'at' => $order->escrow_released_at, 'sub' => '₦' . number_format($order->sellerAmount(), 2)] : null,
            $order->refunded_at ? ['title' => 'Buyer refunded', 'at' => $order->refunded_at] : null,
            in_array($order->status, ['cancelled']) ? ['title' => 'Cancelled', 'at' => $order->updated_at, 'sub' => $order->cancellation_reason] : null,
        ]));

        return response()->json([
            'order'    => $order,
            'money'    => [
                'subtotal'      => (float) $order->subtotal,
                'courier_fee'   => (float) ($order->courier_fee ?? $order->shipping_fee ?? 0),
                'discount'      => (float) ($order->discount_amount ?? 0),
                'payment_total' => $payTotal,
                'order_total'   => (float) $order->total,
                'flockr_fee'    => (float) ($order->flockr_fee ?? $order->platform_fee ?? 0),
                'seller_earning'=> $order->sellerAmount(),
            ],
            'escrow'   => [
                'state'      => $order->escrow_released_at ? 'released' : ($order->paid_at && in_array($order->status, ['paid', 'confirmed', 'processing', 'shipped', 'delivered', 'disputed']) ? 'held' : 'none'),
                'released_at'=> $order->escrow_released_at,
                'auto_release_at' => $releaseAt,
            ],
            'wallet'   => $wallet,
            'notes'    => $notes,
            'timeline' => $timeline,
            'can'      => [
                'cancel'         => !in_array($order->status, ['cancelled', 'refunded']),
                'retry_refund'   => $order->refund_status === 'failed',
                'release_escrow' => $order->status === 'delivered' && !$order->escrow_released_at,
                'mark_delivered' => in_array($order->status, ['paid', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'in_transit', 'delivery_failed']),
            ],
        ]);
    }

    /** POST /api/admin/orders/{orderId}/cancel   { reason } — cancel, restock and refund the buyer. */
    public function cancel(Request $request, int $orderId): JsonResponse
    {
        $data  = $request->validate(['reason' => 'required|string|max:300']);
        $order = Order::findOrFail($orderId);
        abort_if(in_array($order->status, ['cancelled', 'refunded']), 422, 'This order is already closed.');

        $result = app(OrderController::class)->cancelAndRefund($order, 'Admin: ' . $data['reason']);
        Audit::log('order.cancel', $order, ['reason' => $data['reason']] + $result);

        $msg = 'Order cancelled.';
        if ($result['paid']) $msg = $result['refund_ok'] ? 'Order cancelled and the buyer was refunded.' : 'Order cancelled, but the Paystack refund failed. Use “Retry refund”.';
        return response()->json(['message' => $msg, 'refund_ok' => $result['refund_ok']]);
    }

    /** POST /api/admin/orders/{orderId}/retry-refund */
    public function retryRefund(int $orderId): JsonResponse
    {
        $order = Order::findOrFail($orderId);
        abort_unless($order->refund_status === 'failed', 422, 'There is no failed refund on this order.');

        $r = app(RefundService::class)->refund($order);
        Audit::log('order.retry_refund', $order, ['ok' => $r['ok']]);
        return response()->json(['message' => $r['message'], 'ok' => $r['ok']], $r['ok'] ? 200 : 422);
    }

    /** POST /api/admin/orders/{orderId}/release-escrow — pay the seller now (order must be delivered). */
    public function releaseEscrow(Request $request, int $orderId): JsonResponse
    {
        $order = Order::findOrFail($orderId);
        abort_unless($order->status === 'delivered', 422, 'Mark the order delivered first.');
        abort_if($order->escrow_released_at, 422, 'Escrow was already released.');
        abort_if($order->refund_status === 'succeeded', 422, 'This order was refunded.');

        $order->releaseEscrow('Released early by admin');
        Audit::log('order.release_escrow', $order, ['amount' => $order->sellerAmount()]);
        return response()->json(['message' => '₦' . number_format($order->sellerAmount(), 2) . ' released to the seller.']);
    }

    /** POST /api/admin/orders/{orderId}/mark-delivered */
    public function markDelivered(int $orderId): JsonResponse
    {
        $order = Order::findOrFail($orderId);
        abort_unless($order->paid_at && !in_array($order->status, ['cancelled', 'refunded', 'delivered']), 422, 'This order can’t be marked delivered.');

        $order->update(['status' => 'delivered', 'delivered_at' => $order->delivered_at ?? now()]);
        Audit::log('order.mark_delivered', $order);
        return response()->json(['message' => 'Marked delivered. Escrow auto-releases 3 days later.']);
    }

    /** POST /api/admin/orders/{orderId}/note */
    public function note(Request $request, int $orderId): JsonResponse
    {
        $data  = $request->validate(['note' => 'required|string|max:1000']);
        $order = Order::findOrFail($orderId);
        Audit::log('order.note', $order, ['note' => $data['note']]);
        return response()->json(['message' => 'Note saved.']);
    }
}
