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
            'promo'   => $q->where('is_public', true),
            'active'  => $q->where('is_public', false)->whereNull('used_at')->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now())),
            'used'    => $q->where('is_public', false)->whereNotNull('used_at'),
            'expired' => $q->where('is_public', false)->whereNull('used_at')->where('expires_at', '<=', now()),
            default   => null,
        };

        if ($request->filled('search')) {
            $s = trim($request->search);
            $q->where(fn ($w) => $w->where('code', 'ilike', "%{$s}%")
                ->orWhereHas('buyer', fn ($u) => $u->where('name', 'ilike', "%{$s}%")->orWhere('username', 'ilike', "%{$s}%")->orWhere('email', 'ilike', "%{$s}%")));
        }

        $live = fn () => Coupon::where('is_public', false)->whereNull('used_at')->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now()));

        return response()->json([
            'rows'  => $q->paginate(30)->withQueryString(),
            'stats' => [
                'active'        => $live()->count(),
                'active_value'  => (float) $live()->sum('amount'),
                'used'          => Coupon::where('is_public', false)->whereNotNull('used_at')->count(),
                'used_value'    => (float) Coupon::where('is_public', false)->whereNotNull('used_at')->sum('amount'),
                'promo_codes'   => Coupon::where('is_public', true)->where('is_active', true)->count(),
                'promo_uses'    => (int) \Illuminate\Support\Facades\DB::table('coupon_redemptions')->where('status', 'used')->count(),
                'promo_given'   => (float) \Illuminate\Support\Facades\DB::table('coupon_redemptions')->where('status', 'used')->sum('discount'),
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
        \App\Notifications\AccountNotice::send($buyer, 'coupon_gift', '🎁 You received a ₦' . number_format((float) $data['amount'], 0) . ' coupon',
            "Flockr has gifted you a coupon. Use code {$coupon->code} at checkout.", '/dashboard?tab=coupons', 'See my coupons', 'shop', ['coupon_code' => $coupon->code],
            ["Coupon code: {$coupon->code}", ($data['min_order'] ?? 0) > 0 ? 'Minimum order: ₦' . number_format((float) $data['min_order'], 0) : 'No minimum order', 'Valid until ' . $coupon->expires_at->toFormattedDateString()]);
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

    /**
     * POST /api/admin/coupons/promo — a PUBLIC code anyone can use (influencer / campaign codes).
     * { code?, kind: percent|fixed, value, max_discount?, min_order?, max_uses?, per_user_limit?, new_users_only?,
     *   funded_by: flockr|shared, campaign?, starts_at?, days? }
     */
    public function storePromo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'           => 'nullable|string|min:3|max:30|regex:/^[A-Za-z0-9_-]+$/',
            'kind'           => 'required|in:percent,fixed',
            'value'          => 'required|numeric|min:1',
            'max_discount'   => 'nullable|numeric|min:0',
            'min_order'      => 'nullable|numeric|min:0',
            'max_uses'       => 'nullable|integer|min:1',
            'per_user_limit' => 'nullable|integer|min:1|max:50',
            'new_users_only' => 'nullable|boolean',
            'funded_by'      => 'required|in:flockr,shared',
            'campaign'       => 'nullable|string|max:120',
            'starts_at'      => 'nullable|date',
            'days'           => 'nullable|integer|min:1|max:730',
        ]);
        if ($data['kind'] === 'percent' && $data['value'] > 90) {
            return response()->json(['message' => 'A percentage code cannot be more than 90%.'], 422);
        }

        $code = strtoupper($data['code'] ?? ('FLK' . Str::random(6)));
        if (Coupon::where('code', $code)->exists()) {
            return response()->json(['message' => "The code {$code} already exists. Pick another."], 422);
        }

        $coupon = Coupon::create([
            'code'           => $code,
            'buyer_id'       => null,
            'review_id'      => null,
            'is_public'      => true,
            'is_active'      => true,
            'kind'           => $data['kind'],
            'percent'        => $data['kind'] === 'percent' ? $data['value'] : null,
            'amount'         => $data['kind'] === 'fixed' ? $data['value'] : 0,
            'max_discount'   => $data['max_discount'] ?? null,
            'min_order'      => $data['min_order'] ?? 0,
            'max_uses'       => $data['max_uses'] ?? null,
            'per_user_limit' => $data['per_user_limit'] ?? 1,
            'new_users_only' => (bool) ($data['new_users_only'] ?? false),
            'funded_by'      => $data['funded_by'],
            'campaign'       => $data['campaign'] ?? null,
            'starts_at'      => $data['starts_at'] ?? null,
            'expires_at'     => isset($data['days']) ? now()->addDays($data['days']) : null,
        ]);

        Audit::log('coupon.promo.create', $coupon, ['code' => $code, 'kind' => $data['kind'], 'value' => $data['value'], 'campaign' => $data['campaign'] ?? null]);
        return response()->json(['message' => "Promo code {$code} created.", 'coupon' => $coupon]);
    }

    /** POST /api/admin/coupons/{couponId}/toggle — pause / resume a promo code */
    public function toggle(int $couponId): JsonResponse
    {
        $c = Coupon::findOrFail($couponId);
        $c->update(['is_active' => !$c->is_active]);
        Audit::log('coupon.toggle', $c, ['active' => $c->is_active]);
        return response()->json(['message' => $c->is_active ? 'Code resumed.' : 'Code paused.']);
    }
}
