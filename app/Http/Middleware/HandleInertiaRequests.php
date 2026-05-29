<?php

namespace App\Http\Middleware;

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
        $user = $request->user();

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? [
                    'id'                       => $user->id,
                    'name'                     => $user->name,
                    'username'                 => $user->username,
                    'email'                    => $user->email,
                    'phone'                    => $user->phone,
                    'role'                     => $user->role,
                    'bio'                      => $user->bio,
                    'location'                 => $user->location,
                    'avatar_url'               => $user->avatar_url,   // computed accessor
                    'is_verified'              => $user->is_verified,
                    'is_active'                => $user->is_active,
                    'followers_count'          => $user->followers_count ?? 0,
                    'following_count'          => $user->following_count ?? 0,
                    'total_sales'              => $user->total_sales ?? 0,
                    'wallet_balance'           => $user->wallet_balance,  // computed accessor
                    'notification_preferences' => $user->notification_preferences ?? [],

                    // Bank / payout fields — required for ATM card display
                    'paystack_subaccount_code' => $user->paystack_subaccount_code,
                    'paystack_recipient_code'  => $user->paystack_recipient_code,
                    'bank_name'                => $user->bank_name,
                    'bank_code'                => $user->bank_code,
                    'account_name'             => $user->account_name,
                    'account_last4'            => $user->account_last4,
                    // Never expose full account_number to frontend
                ] : null,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
        ]);
    }
}