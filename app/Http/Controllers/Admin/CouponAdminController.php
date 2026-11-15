<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CouponAdminController extends Controller
{
    /** GET /api/admin/coupons */
    public function index(Request $request): JsonResponse
    {
        $q = Coupon::with(['buyer:id,name,username,avatar', 'usedOnOrder:id,reference'])->latest();

        match ($request->input('status')) {
            'active'  => $q->whereNull('used_at')->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now())),
            'used'    => $q->whereNotNull('used_at'),
            'expired' => $q->whereNull('used_at')->where('expires_at', '<=', now()),
            default   => null,
        };

        if ($request->filled('search')) {
            $s = trim($request->search);
            $q->where(fn ($w) => $w->where('code', 'ilike', "%{$s}%")
                ->orWhereHas('buyer', fn ($u) => $u->where('name', 'ilike', "%{$s}%")->orWhere('username', 'ilike', "%{$s}%")->orWhere('email', 'ilike', "%{$s}%")));
        }

        $live = fn () => Coupon::whereNull('used_at')->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now()));

        return response()->json([
            'rows'  => $q->paginate(30)->withQueryString(),
            'stats' => [
                'active'        => $live()->count(),
                'active_value'  => (float) $live()->sum('amount'),
                'used'          => Coupon::whereNotNull('used_at')->count(),
                'used_value'    => (float) Coupon::whereNotNull('used_at')->sum('amount'),
            ],
        ]);
    }

    /** POST /api/admin/coupons  { buyer, amount, min_order?, days } — goodwill coupon. `buyer` = username or email. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'buyer'     => 'required|string|max:120',
            'amount'    => 'required|numeric|min:100|max:50000',
            'min_order' => 'nullable|numeric|min:0',
            'days'      => 'required|integer|min:1|max:365',
        ]);

        $b = ltrim($data['buyer'], '@');
        $buyer = User::where('username', $b)->orWhere('email', $b)->first();
        if (!$buyer) return response()->json(['message' => 'No user found with that username or email.'], 422);

        try {
            $coupon = Coupon::create([
                'code'      => 'FLKGW-' . strtoupper(Str::random(4)) . '-' . strtoupper(Str::random(4)),
                'buyer_id'  => $buyer->id,
                'review_id' => null,
                'amount'    => $data['amount'],
                'min_order' => $data['min_order'] ?? 0,
                'expires_at'=> now()->addDays($data['days']),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Could not create coupon (is coupons.review_id nullable?): ' . $e->getMessage()], 500);
        }

        Audit::log('coupon.create', $coupon, ['buyer' => $buyer->id, 'amount' => (float) $data['amount']]);
        return response()->json(['message' => "Coupon {$coupon->code} created for @{$buyer->username}.", 'coupon' => $coupon]);
    }

    /** POST /api/admin/coupons/{couponId}/void */
    public function void(int $couponId): JsonResponse
    {
        $c = Coupon::findOrFail($couponId);
        abort_if($c->used_at, 422, 'This coupon was already used.');
        $c->update(['expires_at' => now()->subSecond()]);
        Audit::log('coupon.void', $c);
        return response()->json(['message' => 'Coupon voided.']);
    }

    /** POST /api/admin/coupons/{couponId}/extend  { days } */
    public function extend(Request $request, int $couponId): JsonResponse
    {
        $data = $request->validate(['days' => 'required|integer|min:1|max:365']);
        $c = Coupon::findOrFail($couponId);
        abort_if($c->used_at, 422, 'This coupon was already used.');
        $base = $c->expires_at && $c->expires_at->isFuture() ? $c->expires_at : now();
        $c->update(['expires_at' => $base->copy()->addDays($data['days'])]);
        Audit::log('coupon.extend', $c, ['days' => $data['days']]);
        return response()->json(['message' => 'Extended to ' . $c->fresh()->expires_at->format('j M Y') . '.']);
    }
}
