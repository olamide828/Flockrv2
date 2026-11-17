<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Admin v2 — manage Pro subscriptions (paid ones are read-only money; admin can grant/extend/cancel access). */
class SubscriptionAdminController extends Controller
{
    private const DAYS = ['monthly' => 30, 'yearly' => 365];

    public function index(Request $request): JsonResponse
    {
        $q = Subscription::with('user:id,name,username,email,avatar');
        $live = fn ($w) => $w->where('status', 'active')->where('expires_at', '>', now());

        match ($request->input('status')) {
            'active'    => $q->where($live),
            'expiring'  => $q->where($live)->where('expires_at', '<=', now()->addDays(7)),
            'expired'   => $q->where(fn ($w) => $w->where('status', 'expired')->orWhere(fn ($x) => $x->where('status', 'active')->where('expires_at', '<=', now()))),
            'cancelled' => $q->where('status', 'cancelled'),
            default     => null,
        };
        if ($p = $request->input('plan')) $q->where('plan', $p);
        if ($s = trim((string) $request->input('search'))) {
            $like = '%' . $s . '%';
            $q->where(fn ($w) => $w->where('paystack_reference', 'ilike', $like)
                ->orWhereHas('user', fn ($u) => $u->where('name', 'ilike', $like)->orWhere('username', 'ilike', $like)->orWhere('email', 'ilike', $like)));
        }

        $rows = $q->latest()->paginate(25)->through(function ($s) {
            $effective = $s->status === 'active' && $s->expires_at->isPast() ? 'expired' : $s->status;
            return [
                'id' => $s->id, 'user' => $s->user, 'plan' => $s->plan, 'amount_paid' => (float) $s->amount_paid,
                'reference' => $s->paystack_reference, 'status' => $effective, 'granted' => str_starts_with($s->paystack_reference, 'ADMIN-'),
                'starts_at' => $s->starts_at, 'expires_at' => $s->expires_at, 'created_at' => $s->created_at,
            ];
        });

        $active = Subscription::where($live)->get(['plan', 'amount_paid', 'paystack_reference']);
        $paid   = $active->filter(fn ($s) => !str_starts_with($s->paystack_reference, 'ADMIN-'));
        $mrr    = $paid->sum(fn ($s) => $s->plan === 'yearly' ? $s->amount_paid / 12 : $s->amount_paid);

        return response()->json(['rows' => $rows, 'stats' => [
            'active'    => $active->count(),
            'granted'   => $active->count() - $paid->count(),
            'mrr'       => round($mrr, 2),
            'expiring'  => Subscription::where($live)->where('expires_at', '<=', now()->addDays(7))->count(),
            'revenue_30d' => (float) Subscription::where('created_at', '>=', now()->subDays(30))->where('paystack_reference', 'not like', 'ADMIN-%')->sum('amount_paid'),
        ]]);
    }

    public function grant(Request $request): JsonResponse
    {
        $data = $request->validate(['user_id' => 'required|integer|exists:users,id', 'plan' => 'required|in:monthly,yearly', 'days' => 'nullable|integer|min:1|max:1095', 'note' => 'nullable|string|max:200']);
        $user = User::findOrFail($data['user_id']);
        $days = $data['days'] ?? self::DAYS[$data['plan']];

        // extend from the current expiry if they already have time left
        $current = $user->activeSubscription();
        $start   = now();
        $end     = ($current?->expires_at ?? now())->copy()->addDays($days);

        $sub = Subscription::create([
            'user_id' => $user->id, 'plan' => $data['plan'], 'amount_paid' => 0,
            'paystack_reference' => 'ADMIN-' . strtoupper((string) Str::ulid()),
            'status' => 'active', 'starts_at' => $start, 'expires_at' => $end,
        ]);
        Audit::log('subscription.grant', $sub, ['user_id' => $user->id, 'days' => $days, 'note' => $data['note'] ?? null]);
        try { $user->notify(new \App\Notifications\ProGrantedNotification($data['plan'], $end, (bool) $current, $data['note'] ?? null)); }
        catch (\Throwable $e) { report($e); }   // a mail hiccup must never undo the grant
        return response()->json(['message' => "Pro granted to @{$user->username} until {$end->toFormattedDateString()}."]);
    }

    public function extend(Request $request, $subscriptionId): JsonResponse
    {
        $data = $request->validate(['days' => 'required|integer|min:1|max:1095']);
        $sub = Subscription::findOrFail($subscriptionId);
        abort_if($sub->status === 'cancelled', 422, 'Cancelled subscriptions cannot be extended. Grant a new one.');
        $base = $sub->expires_at->isFuture() ? $sub->expires_at : now();
        $sub->update(['status' => 'active', 'expires_at' => $base->copy()->addDays($data['days'])]);
        Audit::log('subscription.extend', $sub, ['days' => $data['days']]);
        try { $sub->user?->notify(new \App\Notifications\ProGrantedNotification($sub->plan, $sub->fresh()->expires_at, true)); }
        catch (\Throwable $e) { report($e); }
        return response()->json(['message' => "Extended by {$data['days']} days."]);
    }

    public function cancel($subscriptionId): JsonResponse
    {
        $sub = Subscription::findOrFail($subscriptionId);
        $sub->update(['status' => 'cancelled', 'expires_at' => now()]);
        Audit::log('subscription.cancel', $sub, ['user_id' => $sub->user_id]);
        \App\Notifications\AccountNotice::send($sub->user, 'pro_cancelled', 'Your Flockr Pro has ended', 'Your Pro plan was cancelled, so the standard commission applies again. You can re-subscribe any time from your dashboard.', '/seller/dashboard', 'Open dashboard');
        return response()->json(['message' => 'Subscription cancelled. Any payment refund is handled in Paystack.']);
    }
}
