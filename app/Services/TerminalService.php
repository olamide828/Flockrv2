<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * TerminalService — Terminal Africa (TShip) API wrapper
 *
 * .env keys:
 *   TERMINAL_SECRET_KEY=sk_test_xxxx
 *   TERMINAL_BASE_URL=https://sandbox.terminal.africa/v1        (shipments/rates/parcels)
 *   TERMINAL_PUBLIC_BASE_URL=https://api.terminal.africa/v1     (states/cities — always live)
 *   TERMINAL_WEBHOOK_SECRET=   (set after registering webhook URL)
 *
 * Note: states/cities endpoints are ONLY available on the live API URL,
 * even when using sandbox/test keys. Shipment endpoints use the sandbox URL.
 */
class TerminalService
{
    private string  $baseUrl;
    private string  $publicBaseUrl;
    private ?string $secretKey;

    public function __construct()
    {
        $this->secretKey     = config('services.terminal.secret_key');
        $this->baseUrl       = rtrim(config('services.terminal.base_url',        'https://sandbox.terminal.africa/v1'), '/');
        $this->publicBaseUrl = rtrim(config('services.terminal.public_base_url', 'https://api.terminal.africa/v1'),     '/');
    }

    // ── Location data (states / cities) ───────────────────────────────────────

    /**
     * Get Terminal-valid Nigerian states.
     * Uses the live API URL — these are public data, no auth needed.
     * Cached for 7 days.
     */
    public function getStates(): array
    {
        $cached = Cache::get('terminal_ng_states');
        if (!empty($cached)) {
            return $cached;
        }
        Cache::forget('terminal_ng_states');

        $response = Http::timeout(20)
            ->withHeaders(['Authorization' => 'Bearer ' . $this->secretKey])
            ->get($this->publicBaseUrl . '/states', ['country_code' => 'NG']);

        if ($response->failed()) {
            Log::warning('Terminal getStates failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return [];
        }

        $states = $response->json('data') ?? [];
        Log::info('Terminal getStates: loaded ' . count($states) . ' states');

        if (!empty($states)) {
            Cache::put('terminal_ng_states', $states, 604800);
        }

        return $states;
    }

    /**
     * Get Terminal-valid cities for a Nigerian state.
     * Uses the live API URL. Cached per state for 7 days.
     */
    public function getCities(string $stateCode): array
    {
        $cacheKey = 'terminal_cities_' . $stateCode;

        // Never serve cached empty arrays — they mean a previous request failed
        $cached = Cache::get($cacheKey);
        if (!empty($cached)) {
            return $cached;
        }
        Cache::forget($cacheKey);

        $response = Http::timeout(20)
            ->withHeaders(['Authorization' => 'Bearer ' . $this->secretKey])
            ->get($this->publicBaseUrl . '/cities', [
                'country_code' => 'NG',
                'state_code'   => $stateCode,
            ]);

        if ($response->failed()) {
            Log::warning('Terminal getCities failed', [
                'state_code' => $stateCode,
                'status'     => $response->status(),
                'body'       => $response->body(),
            ]);
            return []; // do NOT cache empty results
        }

        $cities = $response->json('data') ?? [];
        Log::info('Terminal getCities: loaded ' . count($cities) . ' cities for ' . $stateCode);

        // Only cache if we got actual results
        if (!empty($cities)) {
            Cache::put($cacheKey, $cities, 604800);
        }

        return $cities;
    }

    // ── Rates ──────────────────────────────────────────────────────────────────

    /**
     * Get shipping rates between seller pickup and buyer delivery.
     *
     * @param array $pickup   {name, phone, address, city, state, country, postal_code}
     * @param array $delivery {name, phone, address, city, state, country, postal_code}
     * @param array $parcel   {weight, items_count, description?}
     * @throws \RuntimeException on API failure
     */
    public function getRates(array $pickup, array $delivery, array $parcel): array
    {
        $this->assertConfigured();

        $packagingId = $this->getDefaultPackagingId();
        $parcelId    = $this->createParcel($parcel, $packagingId);
        $pickupId    = $this->createAddress($pickup);
        $deliveryId  = $this->createAddress($delivery);

        $response = $this->get('/rates/shipment', [
            'pickup_address'   => $pickupId,
            'delivery_address' => $deliveryId,
            'parcel_id'        => $parcelId,
            'currency'         => 'NGN',
        ]);

        Log::info('Terminal getRates response', ['data' => $response['data'] ?? []]);

        $rates = $response['data'] ?? [];

        if (empty($rates)) {
            throw new \RuntimeException(
                'No shipping options available for this route. ' .
                'Make sure carriers are enabled in your Terminal Africa dashboard (Dashboard → Carriers).'
            );
        }

        $mapped = array_map(fn($r) => [
            'rate_id'        => $r['rate_id'] ?? $r['id'],
            'carrier'        => $r['carrier_name'],
            'service'        => $r['carrier_rate_description'] ?? 'Standard Delivery',
            'amount'         => (float) ($r['amount'] ?? 0),
            'currency'       => $r['currency'] ?? 'NGN',
            'estimated_days' => $r['delivery_time'] ?? '2-5 days',
            'pickup_eta'     => $r['pickup_time'] ?? null,
            'carrier_logo'   => $r['carrier_logo'] ?? null,
            'delivery_date'  => isset($r['delivery_date'])
                ? \Carbon\Carbon::parse($r['delivery_date'])->format('D, d M Y')
                : null,
            'pickup_date'    => isset($r['pickup_date'])
                ? \Carbon\Carbon::parse($r['pickup_date'])->format('D, d M Y')
                : null,
        ], $rates);

        // Sort cheapest to most expensive so the default selected rate is always the cheapest
        usort($mapped, fn($a, $b) => $a['amount'] <=> $b['amount']);

        return $mapped;
    }

    /**
     * Create a shipment and arrange pickup — called after payment confirmed.
     *
     * @throws \RuntimeException on API failure
     */
    public function createShipment(
        Order  $order,
        string $rateId,
        array  $pickup,
        array  $delivery,
        array  $parcel,
    ): array {
        $this->assertConfigured();

        $packagingId = $this->getDefaultPackagingId();
        $parcelId    = $this->createParcel($parcel, $packagingId);

        // Use inline address objects for shipment creation
        // Address IDs expire quickly and cannot be reused across API calls
        $shipmentResponse = $this->post('/shipments', [
            'pickup_address'   => $this->buildAddressPayload($pickup),
            'delivery_address' => $this->buildAddressPayload($delivery),
            'parcel'           => $parcelId,
            'metadata'         => [
                'order_id'        => $order->id,
                'order_reference' => $order->reference,
            ],
        ]);

        $shipmentId = $shipmentResponse['data']['shipment_id']
                   ?? $shipmentResponse['data']['_id']
                   ?? null;

        if (!$shipmentId) {
            Log::error('Terminal: shipment creation failed', ['response' => $shipmentResponse]);
            throw new \RuntimeException('Failed to create shipment on Terminal Africa.');
        }

        // Arrange pickup — triggers courier to go to seller
        $arrangeResponse = $this->post('/shipments/arrange', [
            'shipment_id' => $shipmentId,
            'rate_id'     => $rateId,
        ]);

        Log::info('Terminal arrangePickup', [
            'order'    => $order->reference,
            'response' => $arrangeResponse,
        ]);

        $data = $arrangeResponse['data'] ?? [];

        return [
            'shipment_id'     => $shipmentId,
            'tracking_number' => $data['tracking_number'] ?? null,
            'label_url'       => $data['label_url']       ?? null,
            'carrier'         => $data['carrier_name']    ?? null,
        ];
    }

    /**
     * Get tracking events for a shipment.
     */
    public function trackShipment(string $shipmentId): array
    {
        $this->assertConfigured();

        $response = $this->get('/shipments/' . $shipmentId . '/events');
        return $response['data'] ?? [];
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function getDefaultPackagingId(): string
    {
        $id = Cache::remember('terminal_default_packaging_id', 86400, function () {
            $response = $this->get('/packaging/default/terminal');
            return $response['data']['packaging_id']
                ?? $response['data'][0]['packaging_id']
                ?? null;
        });

        if (!$id) {
            Cache::forget('terminal_default_packaging_id');
            throw new \RuntimeException(
                'Could not retrieve Terminal packaging. Check your API key and account status.'
            );
        }

        return $id;
    }

    private function createParcel(array $parcel, string $packagingId): string
    {
        $items = $parcel['items'] ?? [[
            'name'        => 'Product',
            'description' => 'Flockr marketplace item',
            'currency'    => 'NGN',
            'value'       => 1000,
            'quantity'    => max(1, (int) ($parcel['items_count'] ?? 1)),
            'weight'      => max(0.1, (float) ($parcel['weight'] ?? 0.5)),
        ]];

        $payload = [
            'description' => $parcel['description'] ?? 'Flockr order package',
            'weight_unit' => 'kg',
            'items'       => $items,
        ];

        if ($packagingId) {
            $payload['packaging'] = $packagingId;
        }

        $response = $this->post('/parcels', $payload);

        $parcelId = $response['data']['parcel_id'] ?? $response['data']['_id'] ?? null;

        if (!$parcelId) {
            throw new \RuntimeException(
                'Failed to create parcel: ' . ($response['message'] ?? 'Unknown error')
            );
        }

        return $parcelId;
    }

    private function createAddress(array $addr): string
    {
        $nameParts = explode(' ', trim($addr['name'] ?? 'Flockr User'), 2);

        $response = $this->post('/addresses', [
            'first_name'     => $nameParts[0],
            'last_name'      => $nameParts[1] ?? $nameParts[0],
            'line1'          => $addr['address'] ?? $addr['street'] ?? 'N/A',
            'city'           => $addr['city']    ?? '',
            'state'          => $addr['state']   ?? '',
            'country'        => $addr['country'] ?? 'NG',
            'phone'          => $this->formatPhone($addr['phone'] ?? null),
            'zip'            => $addr['postal_code'] ?? '000000',
            'is_residential' => true,
        ]);

        $addressId = $response['data']['address_id'] ?? $response['data']['_id'] ?? null;

        if (!$addressId) {
            throw new \RuntimeException(
                'Failed to create address: ' . ($response['message'] ?? 'Unknown error')
            );
        }

        return $addressId;
    }

    private function buildAddressPayload(array $addr): array
    {
        $nameParts = explode(' ', trim($addr['name'] ?? 'Flockr User'), 2);
        return [
            'first_name'     => $nameParts[0],
            'last_name'      => $nameParts[1] ?? $nameParts[0],
            'line1'          => substr($addr['address'] ?? $addr['street'] ?? 'N/A', 0, 45),
            'city'           => $addr['city']    ?? '',
            'state'          => $addr['state']   ?? '',
            'country'        => $addr['country'] ?? 'NG',
            'phone'          => $this->formatPhone($addr['phone'] ?? null),
            'zip'            => $addr['postal_code'] ?? '000000',
            'is_residential' => true,
        ];
    }

    private function formatPhone(?string $phone): string
    {
        if (!$phone) return '+2348000000000';

        $stripped = preg_replace('/[^0-9+]/', '', trim($phone));

        if (preg_match('/^\+[1-9]\d{6,14}$/', $stripped)) return $stripped;

        $digits = ltrim($stripped, '+');

        if (str_starts_with($digits, '234') && strlen($digits) === 13) return '+' . $digits;
        if (str_starts_with($digits, '0')   && strlen($digits) === 11) return '+234' . substr($digits, 1);
        if (strlen($digits) === 10 && preg_match('/^[789]/', $digits))  return '+234' . $digits;

        return '+234' . ltrim($digits, '0');
    }

    private function assertConfigured(): void
    {
        if (empty($this->secretKey)) {
            throw new \RuntimeException(
                'Terminal Africa is not configured. Set TERMINAL_SECRET_KEY in your .env file.'
            );
        }
    }

    // ── HTTP ──────────────────────────────────────────────────────────────────

    private function post(string $path, array $data): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->secretKey,
            'Content-Type'  => 'application/json',
        ])->timeout(30)->post($this->baseUrl . $path, $data);

        if ($response->failed()) {
            Log::warning('Terminal POST ' . $path . ' failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
                'sent'   => $data,
            ]);

            if (in_array($response->status(), [401, 403])) {
                throw new \RuntimeException(
                    'Terminal API authentication failed. Check TERMINAL_SECRET_KEY and TERMINAL_BASE_URL in .env.'
                );
            }
        }

        return $response->json() ?? [];
    }

    private function get(string $path, array $queryParams = []): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->secretKey,
        ])->timeout(30)->get($this->baseUrl . $path, $queryParams);

        if ($response->failed()) {
            Log::warning('Terminal GET ' . $path . ' failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);

            if (in_array($response->status(), [401, 403])) {
                throw new \RuntimeException(
                    'Terminal API authentication failed.'
                );
            }
        }

        return $response->json() ?? [];
    }
}