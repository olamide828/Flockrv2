<?php

namespace App\Services;

use App\Models\LoginHistory;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Jenssegers\Agent\Agent;

class LoginTrackingService
{

public function record(User $user, string $ip, ?string $userAgent, ?string $sessionId): void
{
    $agent = new Agent();
    $agent->setUserAgent($userAgent ?? '');

    $location = $this->lookupLocation($ip);
    $browser  = $agent->browser();
    $platform = $agent->platform();

    // Has this user ever logged in from this browser+OS combo before?
    $isNewDevice = !LoginHistory::where('user_id', $user->id)
        ->where('browser', $browser)
        ->where('platform', $platform)
        ->exists();

    try {
        LoginHistory::create([
            'user_id'     => $user->id,
            'session_id'  => $sessionId,
            'ip_address'  => $ip,
            'user_agent'  => $userAgent,
            'device_type' => $agent->isMobile() ? 'mobile' : ($agent->isTablet() ? 'tablet' : 'desktop'),
            'browser'     => $browser,
            'platform'    => $platform,
            'city'        => $location['city'] ?? null,
            'region'      => $location['region'] ?? null,
            'country'     => $location['country'] ?? null,
            'created_at'  => now(),
        ]);

        if ($isNewDevice) {
            $this->sendNewDeviceAlert($user, $browser, $platform, $location);
        }
    } catch (\Throwable $e) {
        Log::warning('Login tracking failed: ' . $e->getMessage());
    }
}

private function sendNewDeviceAlert(User $user, ?string $browser, ?string $platform, array $location): void
{
    $locationStr = collect([$location['city'] ?? null, $location['region'] ?? null, $location['country'] ?? null])
        ->filter()->implode(', ') ?: 'an unknown location';

    try {
        \Illuminate\Support\Facades\Mail::raw(
            "Hi {$user->name}, we noticed a new login to your Flockr account from {$browser} on {$platform}, near {$locationStr}. " .
            "If this was you, no action is needed. If you don't recognize this, please change your password immediately and review your logged-in devices in Settings.",
            fn ($m) => $m->to($user->email)->subject('New login to your Flockr account')
        );
    } catch (\Throwable $e) {
        Log::warning('New device alert email failed: ' . $e->getMessage());
    }
}
    private function lookupLocation(?string $ip): array
    {
        if (!$ip || in_array($ip, ['127.0.0.1', '::1'])) {
            return []; // local dev — no point calling out
        }

        try {
            $response = Http::timeout(3)->get("http://ip-api.com/json/{$ip}", [
                'fields' => 'status,country,regionName,city',
            ]);

            if ($response->successful() && $response->json('status') === 'success') {
                return [
                    'city'    => $response->json('city'),
                    'region'  => $response->json('regionName'),
                    'country' => $response->json('country'),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('IP geolocation lookup failed: ' . $e->getMessage());
        }

        return [];
    }
}