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
     * Shared data available in ALL Inertia pages via usePage().props
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),

            'auth' => [
                'user' => $request->user() ? [
                    'id'                 => $request->user()->id,
                    'name'               => $request->user()->name,
                    'username'           => $request->user()->username,
                    'email'              => $request->user()->email,
                    'role'               => $request->user()->role,
                    'avatar_url'         => $request->user()->avatar_url,
                    'is_verified'        => $request->user()->is_verified,
                    'followers_count'    => $request->user()->followers_count,
                    'following_count'    => $request->user()->following_count,
                    'total_sales'        => $request->user()->total_sales,
                    'wallet_balance'     => $request->user()->wallet_balance,
                    'notification_preferences' => $request->user()->notification_preferences,
                ] : null,
            ],

            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],

            'unread_notifications' => fn () => $request->user()
                ? $request->user()->unreadNotifications()->count()
                : 0,
        ];
    }
}
