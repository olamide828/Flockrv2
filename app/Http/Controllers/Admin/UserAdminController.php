<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\User;
use App\Models\Video;
use App\Models\WalletTransaction;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Admin v2 — user list, detail and moderation actions. All ids are raw (soft-deleted users included). */
class UserAdminController extends Controller
{
    private function find($userId): User
    {
        return User::withTrashed()->findOrFail($userId);
    }

    private function card(User $u): array
    {
        return [
            'id' => $u->id, 'name' => $u->name, 'username' => $u->username, 'email' => $u->email,
            'phone' => $u->phone, 'role' => $u->role, 'avatar_url' => $u->avatar_url,
            'is_verified' => (bool) $u->is_verified, 'is_active' => (bool) $u->is_active,
            'is_flagged' => (bool) ($u->is_flagged_for_review ?? false),
            'is_pro' => (bool) ($u->has_active_subscription_flag ?? false),
            'deleted_at' => $u->deleted_at, 'created_at' => $u->created_at, 'last_seen_at' => $u->last_seen_at,
        ];
    }

    /** GET /api/admin/people/users?search=&role=&status=&sort= */
    public function index(Request $request): JsonResponse
    {
        $q = User::withTrashed()->withActiveSubscriptionFlag();

        if ($s = trim((string) $request->input('search'))) {
            $like = '%' . $s . '%';
            $q->where(fn ($w) => $w->where('name', 'ilike', $like)->orWhere('username', 'ilike', $like)
                ->orWhere('email', 'ilike', $like)->orWhere('phone', 'like', $like));
        }
        if ($r = $request->input('role')) $q->where('role', $r);

        switch ($request->input('status')) {
            case 'active':    $q->whereNull('deleted_at')->where('is_active', true); break;
            case 'suspended': $q->whereNull('deleted_at')->where('is_active', false); break;
            case 'deleted':   $q->onlyTrashed(); break;
            case 'verified':  $q->where('is_verified', true); break;
            case 'flagged':   if (Schema::hasColumn('users', 'is_flagged_for_review')) $q->where('is_flagged_for_review', true); break;
            case 'pro':       $q->whereHas('subscriptions', fn ($w) => $w->where('status', 'active')->where('expires_at', '>', now())); break;
        }

        $sort = match ($request->input('sort')) {
            'oldest' => ['created_at', 'asc'], 'name' => ['name', 'asc'], 'seen' => ['last_seen_at', 'desc'], default => ['created_at', 'desc'],
        };
        $rows = $q->orderBy($sort[0], $sort[1])->paginate(25)->through(fn ($u) => $this->card($u));

        $stats = [
            'total'     => User::count(),
            'sellers'   => User::where('role', 'seller')->count(),
            'new_7d'    => User::where('created_at', '>=', now()->subDays(7))->count(),
            'suspended' => User::where('is_active', false)->count(),
            'flagged'   => Schema::hasColumn('users', 'is_flagged_for_review') ? User::where('is_flagged_for_review', true)->count() : 0,
            'pro'       => Subscription::where('status', 'active')->where('expires_at', '>', now())->distinct('user_id')->count('user_id'),
        ];

        return response()->json(['rows' => $rows, 'stats' => $stats]);
    }

    /** GET /api/admin/people/users/{userId} — everything the UserDetail page needs in one call. */
    public function show($userId): JsonResponse
    {
        $u = User::withTrashed()->withActiveSubscriptionFlag()->findOrFail($userId);
        $u->loadCount(['videos', 'products', 'followers', 'following']);

        $pick = fn ($m, array $keys) => Arr::only($m->toArray(), $keys);

        $orders = Order::where(fn ($q) => $q->where('buyer_id', $u->id)->orWhere('seller_id', $u->id))
            ->latest()->limit(25)->get()
            ->map(fn ($o) => $pick($o, ['id', 'reference', 'status', 'total', 'buyer_id', 'seller_id', 'refund_status', 'created_at']) + ['as' => $o->seller_id == $u->id ? 'seller' : 'buyer']);

        $products = Product::withTrashed()->where('seller_id', $u->id)->latest()->limit(20)->get()
            ->map(fn ($p) => $pick($p, ['id', 'slug', 'name', 'price', 'stock', 'status', 'is_active', 'primary_image', 'deleted_at']));
        $videos = Video::withTrashed()->where('user_id', $u->id)->latest()->limit(20)->get()
            ->map(fn ($v) => $pick($v, ['id', 'ulid', 'title', 'caption', 'status', 'views_count', 'thumbnail_url', 'created_at', 'deleted_at']));

        $wallet = [
            'balance'      => (float) $u->wallet_balance,
            'transactions' => WalletTransaction::where('user_id', $u->id)->orderByDesc('id')->limit(30)->get(),
            'payouts'      => Payout::where('seller_id', $u->id)->latest()->limit(15)->get(),
            'bank'         => ['bank_name' => $u->bank_name, 'account_name' => $u->account_name, 'account_last4' => $u->account_last4],
        ];

        $earned = (float) Order::where('seller_id', $u->id)->revenue()->sum(DB::raw('COALESCE(seller_earning, subtotal - platform_fee)'));
        $spent  = (float) Order::where('buyer_id', $u->id)->revenue()->sum('total');

        $reports = \App\Models\Report::where('reported_id', $u->id)->latest()->limit(15)->get()
            ->map(fn ($r) => $pick($r, ['id', 'reason', 'status', 'type', 'created_at']));
        $warnings = $u->offPlatformWarningsReceived()->latest()->limit(15)->get();

        $audit = \App\Models\AdminAuditLog::where('target_type', 'user')->where('target_id', $u->id)
            ->with('admin:id,name,username')->latest()->limit(30)->get();

        return response()->json([
            'user' => $this->card($u) + [
                'bio' => $u->bio, 'location' => $u->location, 'country' => $u->country,
                'email_verified_at' => $u->email_verified_at, 'suspension_reason' => $u->suspension_reason,
                'suspended_at' => $u->suspended_at, 'flagged_at' => $u->flagged_at ?? null,
                'terminal_sender_verified_at' => $u->terminal_sender_verified_at ?? null,
                'followers_count' => $u->followers_count, 'following_count' => $u->following_count,
                'videos_count' => $u->videos_count, 'products_count' => $u->products_count,
                'total_sales' => $u->total_sales,
                'pickup' => [$u->pickup_street, $u->pickup_city, $u->pickup_state],
                'badges' => $u->badges()->get(['badges.id', 'label', 'key'])->map(fn ($b) => ['id' => $b->id, 'label' => $b->label]),
            ],
            'totals'        => ['earned' => $earned, 'spent' => $spent],
            'orders'        => $orders,
            'products'      => $products,
            'videos'        => $videos,
            'wallet'        => $wallet,
            'subscriptions' => Subscription::where('user_id', $u->id)->latest()->limit(20)->get(),
            'reports'       => $reports,
            'warnings'      => $warnings,
            'logins'        => $u->loginHistory()->latest()->limit(15)->get(),
            'audit'         => $audit,
        ]);
    }

    public function verify($userId): JsonResponse
    {
        $u = $this->find($userId);
        $u->update(['is_verified' => !$u->is_verified]);
        Audit::log($u->is_verified ? 'user.verify' : 'user.unverify', $u);
        \App\Notifications\AccountNotice::send($u, 'verification', $u->is_verified ? 'You are now verified ✔' : 'Your verification was removed',
            $u->is_verified ? 'Flockr has verified your account. A verified badge now shows on your profile.' : 'The verified badge was removed from your profile. Contact support if you think this is a mistake.', '/', 'Open Flockr');
        return response()->json(['message' => $u->is_verified ? 'Verified.' : 'Verification removed.', 'is_verified' => $u->is_verified]);
    }

    public function suspend(Request $request, $userId): JsonResponse
    {
        $u = $this->find($userId);
        abort_if($u->id === Auth::id(), 422, 'You cannot suspend yourself.');
        abort_if($u->role === 'admin', 422, 'Change this admin\'s role first.');
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $u->update(['is_active' => false, 'suspension_reason' => $data['reason'], 'suspended_at' => now()]);
        Audit::log('user.suspend', $u, ['reason' => $data['reason']]);
        \App\Notifications\AccountNotice::send($u, 'account_suspended', 'Your Flockr account has been suspended', 'Reason: ' . $data['reason'], '/', 'Appeal this decision', 'account', [],
            ['If you believe this is a mistake you can submit an appeal when you try to sign in.']);
        return response()->json(['message' => 'User suspended.']);
    }

    public function unsuspend($userId): JsonResponse
    {
        $u = $this->find($userId);
        $u->update(['is_active' => true, 'suspension_reason' => null, 'suspended_at' => null]);
        Audit::log('user.unsuspend', $u);
        \App\Notifications\AccountNotice::send($u, 'account_reinstated', 'Your account is active again', 'Your Flockr account has been reinstated. Welcome back!', '/', 'Open Flockr');
        return response()->json(['message' => 'User reinstated.']);
    }

    public function role(Request $request, $userId): JsonResponse
    {
        $u = $this->find($userId);
        $data = $request->validate(['role' => 'required|in:buyer,seller,admin', 'confirm_admin' => 'sometimes|boolean']);
        abort_if($u->id === Auth::id(), 422, 'You cannot change your own role.');
        if ($data['role'] === 'admin') abort_unless($request->boolean('confirm_admin'), 422, 'Confirm admin promotion.');
        $from = $u->role;
        $u->update(['role' => $data['role']]);
        Audit::log('user.role', $u, ['from' => $from, 'to' => $data['role']]);
        if ($data['role'] === 'seller' && $from !== 'seller') {
            \App\Notifications\AccountNotice::send($u, 'role_seller', 'You can now sell on Flockr 🎉', 'Your account was upgraded to a seller account. Add products and upload videos to start selling.', '/seller/dashboard', 'Open seller dashboard');
        } elseif ($data['role'] !== $from) {
            \App\Notifications\AccountNotice::send($u, 'role_changed', 'Your account type changed', "Your account type is now: {$data['role']}.", '/', 'Open Flockr');
        }
        return response()->json(['message' => "Role set to {$data['role']}."]);
    }

    public function clearFlag($userId): JsonResponse
    {
        $u = $this->find($userId);
        $u->forceFill(['is_flagged_for_review' => false, 'flagged_at' => null])->save();
        Audit::log('user.clear_flag', $u);
        \App\Notifications\AccountNotice::send($u, 'seller_cleared', 'Your seller account has been cleared ✅', 'We reviewed your account and removed the review flag. You can keep selling as normal — thank you for your patience.', '/seller/dashboard', 'Open seller dashboard', 'account');
        return response()->json(['message' => 'Flag cleared.']);
    }

    /** Toggle: marks this seller as "Terminal NIN cleared" so DHL/STN carriers show for them. */
    public function terminalCleared($userId): JsonResponse
    {
        abort_unless(Schema::hasColumn('users', 'terminal_sender_verified_at'), 422, 'Run the latest migration first.');
        $u = $this->find($userId);
        $on = $u->terminal_sender_verified_at === null;
        $u->forceFill(['terminal_sender_verified_at' => $on ? now() : null])->save();
        Audit::log($on ? 'user.terminal_cleared' : 'user.terminal_uncleared', $u);
        if ($on) \App\Notifications\AccountNotice::send($u, 'delivery_unlocked', 'More delivery options unlocked 🚚', 'Your sender details are verified, so every courier — including DHL and others — is now available to your buyers.', '/seller/dashboard', 'Open seller dashboard');
        return response()->json(['message' => $on ? 'Marked as cleared for NIN carriers.' : 'Clearance removed.', 'cleared' => $on]);
    }

    public function destroy($userId): JsonResponse
    {
        $u = $this->find($userId);
        abort_if($u->id === Auth::id() || $u->role === 'admin', 422, 'Admins cannot be deleted here.');
        $u->update(['deleted_name' => $u->name, 'deleted_email' => $u->email, 'is_active' => false]);
        Video::where('user_id', $u->id)->whereNull('deleted_at')->update(['deleted_at' => now()]);
        Product::where('seller_id', $u->id)->whereNull('deleted_at')->update(['deleted_at' => now()]);
        $u->delete();
        Audit::log('user.delete', $u);
        return response()->json(['message' => 'User deleted.']);
    }

    public function restore($userId): JsonResponse
    {
        $u = User::onlyTrashed()->findOrFail($userId);
        $u->restore();
        $u->update(['is_active' => true]);
        Audit::log('user.restore', $u);
        \App\Notifications\AccountNotice::send($u, 'account_restored', 'Your account was restored', 'Your Flockr account is back. Your videos and products will return once our team has re-checked them.', '/', 'Open Flockr');
        return response()->json(['message' => 'User restored. Their videos/products stay hidden until re-approved.']);
    }

    /** GET /api/admin/people/flagged */
    public function flagged(Request $request): JsonResponse
    {
        $rows = User::where('is_flagged_for_review', true)
            ->withCount([
                'offPlatformWarningsReceived as shown_count'     => fn ($q) => $q->where('action', 'shown'),
                'offPlatformWarningsReceived as continued_count' => fn ($q) => $q->where('action', 'continued'),
            ])
            ->orderByDesc('flagged_at')->paginate(25)
            ->through(fn ($u) => $this->card($u) + ['flagged_at' => $u->flagged_at, 'shown_count' => $u->shown_count, 'continued_count' => $u->continued_count]);
        return response()->json(['rows' => $rows]);
    }
}
