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

    // The account's very first login ever — this row can never be revoked.
    $isPrimary = !LoginHistory::where('user_id', $user->id)->exists();

    try {
        LoginHistory::create([
            'user_id'     => $user->id,
            'session_id'  => $sessionId,
            'ip_address'  => $ip,
            'user_agent'  => $userAgent,
            'device_type' => $agent->isMobile() ? 'mobile' : ($agent->isTablet() ? 'tablet' : 'desktop'),
            'browser'     => $agent->browser(),
            'platform'    => $agent->platform(),
            'city'        => $location['city'] ?? null,
            'region'      => $location['region'] ?? null,
            'country'     => $location['country'] ?? null,
            'created_at'  => now(),
            'is_primary'  => $isPrimary,
        ]);
    } catch (\Throwable $e) {
        Log::warning('Login tracking failed: ' . $e->getMessage());
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