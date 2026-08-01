<?php
namespace App\Http\Controllers;

use App\Models\Badge;
use App\Models\Subscription;
use App\Models\UserBadge;
use App\Services\PaystackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SubscriptionController extends Controller
{
    const PRICES = [
        'monthly' => ['amount' => 3000,  'days' => 30,  'label' => 'Monthly'],
        'yearly'  => ['amount' => 30600, 'days' => 365, 'label' => 'Yearly'],
    ];
    const FIRST_TIME_DISCOUNT = 0.05;

    public function plans(): JsonResponse
    {
        $user = Auth::user();
        $hasSubscribedBefore = $user->subscriptions()->exists();

        $plans = [];
        foreach (self::PRICES as $key => $p) {
            $amount = $p['amount'];
            $discountedAmount = $hasSubscribedBefore ? $amount : round($amount * (1 - self::FIRST_TIME_DISCOUNT));
            $plans[$key] = [
                'label'              => $p['label'],
                'original_amount'    => $amount,
                'amount'             => $discountedAmount,
                'discount_applied'   => !$hasSubscribedBefore,
                'days'               => $p['days'],
            ];
        }

        return response()->json([
            'plans'              => $plans,
            'active_subscription'=> $user->activeSubscription(),
        ]);
    }

    public function checkout(Request $request, PaystackService $paystack): JsonResponse
    {
        $request->validate(['plan' => 'required|in:monthly,yearly']);
        $user = Auth::user();
        $planKey = $request->plan;
        $priceInfo = self::PRICES[$planKey];

        $hasSubscribedBefore = $user->subscriptions()->exists();
        $amount = $hasSubscribedBefore ? $priceInfo['amount'] : round($priceInfo['amount'] * (1 - self::FIRST_TIME_DISCOUNT));

        $reference = 'FLK-SUB-' . now()->format('YmdHis') . '-' . strtoupper(substr(md5(uniqid()), 0, 6));

        $data = $paystack->initializeGenericTransaction(
            email:       $user->email,
            amountNaira: $amount,
            reference:   $reference,
            callbackUrl: route('subscriptions.callback'),
            metadata:    ['type' => 'subscription', 'plan' => $planKey, 'user_id' => $user->id],
        );

        return response()->json(['authorization_url' => $data['authorization_url']]);
    }

    public function callback(Request $request, PaystackService $paystack): RedirectResponse
    {
        $reference = $request->query('reference') ?? $request->query('trxref');
        if (!$reference) {
            return redirect('/@' . Auth::user()->username)->with('error', 'Payment reference missing.');
        }

        try {
            $data = $paystack->verifyTransaction($reference);
        } catch (\Throwable) {
            return redirect('/@' . Auth::user()->username)->with('error', 'Could not verify payment. Contact support if you were charged.');
        }

        if (($data['status'] ?? null) !== 'success') {
            return redirect('/@' . Auth::user()->username)->with('error', 'Payment was not successful.');
        }

        $plan = $data['metadata']['plan'] ?? null;
        if (!isset(self::PRICES[$plan])) {
            return redirect('/@' . Auth::user()->username)->with('error', 'Invalid subscription plan.');
        }

        $existing = Subscription::where('paystack_reference', $reference)->first();
        if ($existing) {
            return redirect('/@' . Auth::user()->username)->with('success', 'Subscription already active!');
        }

        $days = self::PRICES[$plan]['days'];
        $sub = Subscription::create([
            'user_id'             => Auth::id(),
            'plan'                => $plan,
            'amount_paid'         => $data['amount'] / 100,
            'paystack_reference'  => $reference,
            'status'              => 'active',
            'starts_at'           => now(),
            'expires_at'          => now()->addDays($days),
        ]);

        $badge = Badge::where('key', 'pro_member')->first();
        if ($badge) {
            UserBadge::firstOrCreate(['user_id' => Auth::id(), 'badge_id' => $badge->id], ['awarded_at' => now()]);
        }

        
return redirect('/@' . Auth::user()->username)->with('subscription', [
    'plan'       => $plan,
    'expires_at' => $sub->expires_at->toIso8601String(),
    'amount'     => $sub->amount_paid,
]);
    }
}