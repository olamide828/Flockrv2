<?php

namespace App\Http\Middleware;

use App\Models\Message;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Shared props available on every Inertia page.
     * Adding bank fields here means after updateBank() redirects back,
     * the frontend immediately sees the updated auth.user with the new
     * bank details — so the ATM card renders without a manual page refresh.
     */
    public function share(Request $request): array
    {
        if ($request->user()) {
            $request->user()->updateQuietly(['last_seen_at' => now()]);
        }
        $user = $request->user();

        return array_merge(parent::share($request), [
            'auth' => [

                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'bio' => $user->bio,
                    'location' => $user->location,
                    'avatar_url' => $user->avatar_url, 
                    'is_verified' => $user->is_verified,
                    'verification_type' => $user->verification_type,
                    'is_subscriber' => $user->hasActiveSubscription(),
                    'chat_theme' => $user->chat_theme ?? 'off',
                    'email_verified_at' => $user->email_verified_at,
                    'is_active' => $user->is_active,
                    'followers_count' => $user->followers_count ?? 0,
                    'following_count' => $user->following_count ?? 0,
                    'total_sales' => $user->total_sales ?? 0,
                    'wallet_balance' => $user->wallet_balance, 
                    'notification_preferences' => $user->notification_preferences ?? [],
                    'unread_messages' => $user
                        ? Message::whereHas('conversation.participants', function ($q) use ($user) {
                            $q->where('user_id', $user->id);
                        })
                            ->whereNull('read_at')
                            ->where('sender_id', '!=', $user->id)
                            ->distinct('sender_id')
                            ->count('sender_id')
                        : 0,


                    // Bank / payout fields — required for ATM card display
                    'paystack_subaccount_code' => $user->paystack_subaccount_code,
                    'paystack_recipient_code' => $user->paystack_recipient_code,
                    'bank_name' => $user->bank_name,
                    'bank_code' => $user->bank_code,
                    'account_name' => $user->account_name,
                    'account_last4' => $user->account_last4,
                    // Never expose full account_number to frontend
                ] : null,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'subscription' => $request->session()->get('subscription'),
            ],
        ]);
    }
}