<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Payout;
use App\Services\PaystackService;
use App\Services\WalletService;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Seller payouts. Money only ever goes from a SELLER's wallet to that SELLER's bank.
 * There is deliberately no endpoint that moves Flockr's own balance to an admin.
 */
class PayoutAdminController extends Controller
{
    /** GET /api/admin/payouts */
    public function index(Request $request): JsonResponse
    {
        $q = Payout::with('seller:id,name,username,avatar,bank_name,account_last4,account_name,paystack_recipient_code')->latest();

        if ($request->filled('status') && $request->status !== 'all') $q->where('status', $request->status);
        if ($request->filled('search')) {
            $s = $request->search;
            $q->whereHas('seller', fn ($u) => $u->where('username', 'ilike', "%{$s}%")->orWhere('name', 'ilike', "%{$s}%"));
        }

        return response()->json([
            'rows'  => $q->paginate(30)->withQueryString(),
            'stats' => [
                'pending_count'   => Payout::where('status', 'pending')->count(),
                'pending_amount'  => (float) Payout::where('status', 'pending')->sum('amount'),
                'paid_count_30d'  => Payout::where('status', 'paid')->where('created_at', '>=', now()->subDays(30))->count(),
                'paid_amount_30d' => (float) Payout::where('status', 'paid')->where('created_at', '>=', now()->subDays(30))->sum('amount'),
                'failed_30d'      => Payout::where('status', 'failed')->where('created_at', '>=', now()->subDays(30))->count(),
            ],
            'live'  => $this->live(),
        ]);
    }

    private function live(): bool
    {
        // The admin switch wins; the env var is only the starting default.
        return (bool) AppSetting::get('payouts.live', config('services.paystack.live_transfers', false));
    }

    /** POST /api/admin/payouts/live  { live: bool } — the "Go live" switch. */
    public function setLive(Request $request): JsonResponse
    {
        $data = $request->validate(['live' => 'required|boolean']);
        $key = (string) (config('services.paystack.secret') ?: config('services.paystack.secret_key') ?: '');

        if ($data['live']) {
            if (!str_starts_with($key, 'sk_live_')) {
                return response()->json(['message' => 'Real transfers need your Paystack LIVE secret key (sk_live_…) in the environment. It is currently ' . ($key === '' ? 'missing' : 'a test key') . '.'], 422);
            }
            if (!$request->boolean('confirm')) {
                return response()->json(['message' => 'Please confirm you want real money to move.'], 422);
            }
        }

        AppSetting::set('payouts.live', (bool) $data['live']);
        Audit::log('payout.mode', null, ['live' => (bool) $data['live']]);

        return response()->json(['live' => (bool) $data['live'], 'message' => $data['live'] ? 'Payouts are LIVE. Approving now sends real money.' : 'Back to test mode. No real money will move.']);
    }

    /** POST /api/admin/payouts/{payout}/approve */
    public function approve(Payout $payout): JsonResponse
    {
        // Lock + re-check so a double click can't pay twice.
        $claimed = DB::transaction(function () use ($payout) {
            $p = Payout::whereKey($payout->id)->lockForUpdate()->first();
            if (!$p || $p->status !== 'pending') return false;
            $p->update(['status' => 'processing']);
            return true;
        });
        if (!$claimed) return response()->json(['message' => 'This payout is not pending.'], 422);

        $payout->refresh();
        $seller = $payout->seller;

        if (!$seller?->paystack_recipient_code) {
            $payout->update(['status' => 'pending']);
            return response()->json(['message' => 'Seller has no Paystack recipient code. They need to reconnect their bank.'], 422);
        }

        // Test mode (Paystack Starter Business can't send third-party transfers): mark paid, no real money moves.
        if (!$this->live()) {
            $payout->update(['status' => 'paid', 'reference' => 'TEST-FLK-PAY-' . $payout->id . '-' . now()->timestamp, 'paid_at' => now()]);
            $this->notify($payout);
            Audit::log('payout.approve', $payout, ['mode' => 'test', 'amount' => (float) $payout->amount]);
            return response()->json(['message' => '₦' . number_format($payout->amount, 2) . ' marked paid (test mode — no real transfer).']);
        }

        try {
            $transfer = app(PaystackService::class)->initiateTransfer(
                recipientCode: $seller->paystack_recipient_code,
                amount: (float) $payout->amount,
                reason: "Flockr payout to @{$seller->username}",
                reference: 'FLK-PAY-' . $payout->id,
            );
            $payout->update(['status' => 'paid', 'reference' => $transfer['reference'] ?? ('FLK-PAY-' . $payout->id), 'paid_at' => now()]);
            $this->notify($payout);
            Audit::log('payout.approve', $payout, ['mode' => 'live', 'amount' => (float) $payout->amount]);
            return response()->json(['message' => '₦' . number_format($payout->amount, 2) . " sent to {$seller->account_name}."]);
        } catch (\Throwable $e) {
            Log::error('Payout transfer failed', ['payout' => $payout->id, 'error' => $e->getMessage()]);
            $this->returnToWallet($payout, 'Payout failed — funds returned to wallet');
            $payout->update(['status' => 'failed', 'failure_reason' => mb_substr($e->getMessage(), 0, 250)]);
            Audit::log('payout.transfer_failed', $payout, ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Transfer failed: ' . $e->getMessage() . ' The money is back in the seller’s wallet.'], 502);
        }
    }

    /** POST /api/admin/payouts/{payout}/reject  { reason } — returns the money to the seller's wallet. */
    public function reject(Request $request, Payout $payout): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:250']);

        $ok = DB::transaction(function () use ($payout, $data) {
            $p = Payout::whereKey($payout->id)->lockForUpdate()->first();
            if (!$p || $p->status !== 'pending') return false;
            $this->returnToWallet($p, 'Payout rejected: ' . $data['reason']);
            $p->update(['status' => 'failed', 'failure_reason' => $data['reason']]);
            return true;
        });
        if (!$ok) return response()->json(['message' => 'This payout is not pending.'], 422);

        Audit::log('payout.reject', $payout, ['reason' => $data['reason'], 'amount' => (float) $payout->amount]);
        try { $payout->seller->notify(new \App\Notifications\PayoutProcessedNotification($payout->fresh())); } catch (\Throwable) {}
        return response()->json(['message' => 'Payout rejected and ₦' . number_format($payout->amount, 2) . ' returned to the seller’s wallet.']);
    }

    private function returnToWallet(Payout $payout, string $why): void
    {
        app(WalletService::class)->post(
            userId: $payout->seller_id, type: 'credit', amount: (float) $payout->amount,
            source: 'payout_reversal', orderId: null, description: $why,
        );
    }

    private function notify(Payout $payout): void
    {
        try { $payout->seller->notify(new \App\Notifications\PayoutProcessedNotification($payout)); } catch (\Throwable) {}
    }
}
