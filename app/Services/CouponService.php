<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

/**
 * One place for every coupon rule, so Buy-Now checkout, cart checkout and the "apply code" box all agree.
 *
 * Two kinds of coupon:
 *  - private  (buyer_id set)  — a goodwill / review / hunt coupon for ONE user, a fixed ₦ amount, single use.
 *  - public   (is_public)     — a promo/influencer code ANYONE can use: fixed ₦ or % (with a cap), start/expiry,
 *                               total-use limit, per-user limit, optional "first purchase only".
 */
class CouponService
{
    private const PAID = ['paid', 'confirmed', 'processing', 'shipped', 'delivered'];

    public function find(?string $code): ?Coupon
    {
        $code = strtoupper(trim((string) $code));
        return $code === '' ? null : Coupon::where('code', $code)->first();
    }

    /** null when the coupon can be used, otherwise a message to show the buyer. */
    public function problem(Coupon $c, int $userId, float $subtotal): ?string
    {
        if ($c->is_active === false)                              return 'This code is no longer active.';
        if ($c->starts_at && $c->starts_at->isFuture())           return 'This code is not active yet.';
        if ($c->expires_at && $c->expires_at->isPast())           return 'This code has expired.';
        if ($subtotal < (float) $c->min_order)                    return 'This code needs a minimum order of ₦' . number_format((float) $c->min_order, 0) . '.';

        if (!$c->is_public) {
            if ((int) $c->buyer_id !== $userId)                   return 'Invalid or expired coupon code.';
            if ($c->used_at)                                      return 'This coupon has already been used.';
            return null;
        }

        if ($c->max_uses !== null && $this->liveCount($c) >= $c->max_uses) return 'This code has reached its usage limit.';

        $mine = $this->liveCount($c, $userId);
        if ($mine >= max(1, (int) $c->per_user_limit))            return 'You have already used this code.';

        if ($c->new_users_only && Order::where('buyer_id', $userId)->whereIn('status', self::PAID)->exists()) {
            return 'This code is only for first-time buyers.';
        }
        return null;
    }

    /** The ₦ amount this coupon takes off, for this subtotal. */
    public function discount(Coupon $c, float $subtotal): float
    {
        $d = $c->kind === 'percent'
            ? $subtotal * ((float) $c->percent / 100)
            : (float) $c->amount;
        if ($c->kind === 'percent' && $c->max_discount !== null) $d = min($d, (float) $c->max_discount);
        return round(max(0, min($d, $subtotal)), 2);
    }

    /** The best private coupon to auto-apply when the buyer typed no code (existing behaviour). */
    public function bestPrivate(int $userId, float $total): ?Coupon
    {
        return Coupon::where('buyer_id', $userId)->where('is_public', false)->whereNull('used_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where('min_order', '<=', $total)->orderByDesc('amount')->first();
    }

    /** Hold the coupon for an order that is waiting for payment. */
    public function attach(Coupon $c, Order $order, int $userId, float $discount): void
    {
        if ($c->is_public) {
            CouponRedemption::updateOrCreate(['order_id' => $order->id], ['coupon_id' => $c->id, 'user_id' => $userId, 'discount' => $discount, 'status' => 'reserved']);
        } else {
            $c->update(['used_on_order_id' => $order->id]);
        }
    }

    /** Payment confirmed → the coupon is really spent. */
    public function markUsed(Order $order): void
    {
        Coupon::where('used_on_order_id', $order->id)->whereNull('used_at')->update(['used_at' => now()]);

        $r = CouponRedemption::where('order_id', $order->id)->where('status', 'reserved')->first();
        if ($r) {
            $r->update(['status' => 'used']);
            Coupon::where('id', $r->coupon_id)->increment('uses_count');
        }
    }

    /** Order cancelled / failed → give the coupon back. */
    public function release(Order $order): void
    {
        Coupon::where('used_on_order_id', $order->id)->whereNull('used_at')->update(['used_on_order_id' => null]);
        CouponRedemption::where('order_id', $order->id)->where('status', 'reserved')->update(['status' => 'released']);
    }

    /** Paid uses, plus holds from the last 30 minutes (so an abandoned checkout can't lock a code forever). */
    private function liveCount(Coupon $c, ?int $userId = null): int
    {
        return CouponRedemption::where('coupon_id', $c->id)
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->where(fn ($q) => $q->where('status', 'used')->orWhere(fn ($w) => $w->where('status', 'reserved')->where('created_at', '>', now()->subMinutes(30))))
            ->count();
    }
}
