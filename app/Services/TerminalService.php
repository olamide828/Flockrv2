<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * TerminalService — Terminal Africa (TShip) API wrapper
 *
 * Sandbox:  TERMINAL_BASE_URL=https://sandbox.terminal.africa/v1
 * Live:     TERMINAL_BASE_URL=https://api.terminal.africa/v1
 *
 * .env keys needed:
 *   TERMINAL_SECRET_KEY=sk_test_xxxx
 *   TERMINAL_BASE_URL=https://sandbox.terminal.africa/v1
 *   TERMINAL_WEBHOOK_SECRET=   (set after you register webhook URL on Terminal dashboard)
 */
class TerminalService
{
    private string  $baseUrl;
    private ?string $secretKey;

    public function __construct()
    {
        $this->secretKey = config('services.terminal.secret_key');
        $this->baseUrl   = rtrim(
            config('services.terminal.base_url', 'https://sandbox.terminal.africa/v1'),
            '/'
        );
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Get available shipping rates between seller and buyer.
     *
     * @param array $pickup   {name, phone, address, city, state, country, postal_code}
     * @param array $delivery {name, phone, address, city, state, country, postal_code}
     * @param array $parcel   {weight, items_count, description?, items?}
     * @return array  Rate objects ready for frontend display
     * @throws \RuntimeException on API failure
     */
    public function getRates(array $pickup, array $delivery, array $parcel): array
    {
        $this->assertConfigured();

        // Step 1: Get packaging ID
        $packagingId = $this->getDefaultPackagingId();

        // Step 2: Create parcel
        $parcelId = $this->createParcel($parcel, $packagingId);

        // Step 3: Create addresses
        $pickupId   = $this->createAddress($pickup);
        $deliveryId = $this->createAddress($delivery);

        // Step 4: Fetch rates
        $response = $this->get('/rates/shipment', [
            'pickup_address'   => $pickupId,
            'delivery_address' => $deliveryId,
            'parcel_id'        => $parcelId,
            'currency'         => 'NGN',
        ]);

        Log::info('Terminal getRates response', ['response' => $response]);

        $rates = $response['data'] ?? [];

        if (empty($rates)) {
            throw new \RuntimeException(
                'No shipping options available for this route. ' .
                'Please check that carriers are enabled in your Terminal Africa dashboard.'
            );
        }

        return array_map(fn($r) => [
            'rate_id'        => $r['rate_id'] ?? $r['id'],
            'carrier'        => $r['carrier_name'],
            'service'        => $r['carrier_rate_description'] ?? 'Standard Delivery',
            'amount'         => (float) ($r['amount'] ?? 0),
            'currency'       => $r['currency'] ?? 'NGN',
            'estimated_days' => $r['delivery_time'] ?? '2-5 days',
            'pickup_eta'     => $r['pickup_time'] ?? null,
            'carrier_logo'   => $r['carrier_logo'] ?? null,
        ], $rates);
    }

    /**
     * Create a shipment and arrange pickup — called after payment confirmed.
     *
     * @return array {shipment_id, tracking_number, label_url, carrier}
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
        $pickupId    = $this->createAddress($pickup);
        $deliveryId  = $this->createAddress($delivery);

        // Create draft shipment
        $shipmentResponse = $this->post('/shipments', [
            'pickup_address'   => $pickupId,
            'delivery_address' => $deliveryId,
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

        // Arrange pickup — this triggers the courier to come to the seller
        $arrangeResponse = $this->post('/shipments/arrange', [
            'shipment_id' => $shipmentId,
            'rate_id'     => $rateId,
        ]);

        Log::info('Terminal arrangePickup response', [
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
     * Get shipment events / tracking history.
     *
     * @throws \RuntimeException on API failure
     */
    public function trackShipment(string $shipmentId): array
    {
        $this->assertConfigured();

        $response = $this->get("/shipments/{$shipmentId}/events");

        return $response['data'] ?? [];
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Fetch Terminal's default packaging ID.
     * Cached for 24h to avoid repeated API calls.
     *
     * @throws \RuntimeException if packaging cannot be fetched
     */
    private function getDefaultPackagingId(): string
    {
        $id = Cache::remember('terminal_default_packaging_id', 86400, function () {
            $response = $this->get('/packaging/default/terminal');
            Log::info('Terminal default packaging response', ['response' => $response]);

            return $response['data']['packaging_id']
                ?? $response['data'][0]['packaging_id']
                ?? null;
        });

        if (!$id) {
            // Clear cache so next request tries again
            Cache::forget('terminal_default_packaging_id');
            throw new \RuntimeException(
                'Could not retrieve Terminal packaging. Check your Terminal API key and account status.'
            );
        }

        return $id;
    }

    /**
     * Create a parcel on Terminal.
     *
     * @throws \RuntimeException if parcel creation fails
     */
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
                'Failed to create parcel on Terminal: ' .
                ($response['message'] ?? 'Unknown error')
            );
        }

        return $parcelId;
    }

    /**
     * Create an address on Terminal.
     * For rate lookup, city/state/country is sufficient.
     * For actual shipment, full street address is needed.
     *
     * @throws \RuntimeException if address creation fails
     */
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
                'Failed to create address on Terminal: ' .
                ($response['message'] ?? 'Unknown error')
            );
        }

        return $addressId;
    }

    /**
     * Format Nigerian phone numbers to international format (+234...).
     */
    private function formatPhone(?string $phone): string
    {
        if (!$phone) return '+2348000000000';

        $phone = preg_replace('/[^0-9+]/', '', $phone);

        if (str_starts_with($phone, '+')) return $phone;
        if (str_starts_with($phone, '0')) return '+234' . substr($phone, 1);
        if (str_starts_with($phone, '234')) return '+' . $phone;

        return '+234' . $phone;
    }

    /**
     * Throw if service is not configured.
     */
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
            'Authorization' => "Bearer {$this->secretKey}",
            'Content-Type'  => 'application/json',
        ])->timeout(30)->post($this->baseUrl . $path, $data);

        if ($response->failed()) {
            Log::warning("Terminal POST {$path} failed", [
                'status' => $response->status(),
                'body'   => $response->body(),
                'sent'   => $data,
            ]);

            // Throw for 401/403 so caller knows it's an auth issue
            if (in_array($response->status(), [401, 403])) {
                throw new \RuntimeException(
                    'Terminal API authentication failed. Check your TERMINAL_SECRET_KEY and TERMINAL_BASE_URL in .env.'
                );
            }
        }

        return $response->json() ?? [];
    }

    private function get(string $path, array $queryParams = []): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->secretKey}",
        ])->timeout(30)->get($this->baseUrl . $path, $queryParams);

        if ($response->failed()) {
            Log::warning("Terminal GET {$path} failed", [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);

            if (in_array($response->status(), [401, 403])) {
                throw new \RuntimeException(
                    'Terminal API authentication failed. Check your TERMINAL_SECRET_KEY and TERMINAL_BASE_URL in .env.'
                );
            }
        }

        return $response->json() ?? [];
    }
}