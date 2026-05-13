<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaystackService
{
    private const BASE_URL = 'https://api.paystack.co';

    private function client()
    {
        return Http::withToken(config('services.paystack.secret_key'))
            ->baseUrl(self::BASE_URL)
            ->timeout(30)
            ->retry(2, 500);
    }

    // ─── Checkout ─────────────────────────────────────────────────────────────

    /**
     * Initialise a payment transaction.
     * Returns ['authorization_url', 'reference'] to redirect the buyer.
     */
    public function initializeTransaction(Order $order): array
    {
        $response = $this->client()->post('/transaction/initialize', [
            'email'      => $order->buyer->email,
            'amount'     => (int) ($order->total * 100),   // Paystack uses kobo
            'currency'   => 'NGN',
            'reference'  => $order->reference,
            'callback_url' => route('orders.callback'),
            'metadata'   => [
                'order_id'   => $order->id,
                'buyer_id'   => $order->buyer_id,
                'seller_id'  => $order->seller_id,
                'cancel_action' => route('orders.show', $order),
            ],
            // Split payment — seller's subaccount gets their share automatically
            'split'      => $this->buildSplit($order),
        ]);

        if ($response->failed() || !$response->json('status')) {
            Log::error('Paystack init failed', ['order' => $order->reference, 'resp' => $response->json()]);
            throw new \RuntimeException('Payment initialization failed. Please try again.');
        }

        return [
            'authorization_url' => $response->json('data.authorization_url'),
            'reference'         => $response->json('data.reference'),
            'access_code'       => $response->json('data.access_code'),
        ];
    }

    /**
     * Verify a transaction after callback.
     */
    public function verifyTransaction(string $reference): array
    {
        $response = $this->client()->get("/transaction/verify/{$reference}");

        if ($response->failed()) {
            throw new \RuntimeException('Transaction verification failed.');
        }

        return $response->json('data');
    }

    /**
     * Webhook signature verification.
     * Call from PaystackWebhookController before processing.
     */
    public function verifyWebhook(string $payload, string $signature): bool
    {
        $expected = hash_hmac('sha512', $payload, config('services.paystack.secret_key'));
        return hash_equals($expected, $signature);
    }

    // ─── Seller onboarding ────────────────────────────────────────────────────

    /**
     * Create a Paystack subaccount for a seller so splits work automatically.
     */
    public function createSubaccount(User $seller, string $bankCode, string $accountNumber): array
    {
        $response = $this->client()->post('/subaccount', [
            'business_name'       => $seller->name,
            'settlement_bank'     => $bankCode,
            'account_number'      => $accountNumber,
            'percentage_charge'   => config('flockr.platform_fee_percent', 5), // Flockr takes 5%
            'description'         => "Flockr seller: {$seller->username}",
            'primary_contact_email' => $seller->email,
            'primary_contact_phone' => $seller->phone,
        ]);

        if ($response->failed() || !$response->json('status')) {
            throw new \RuntimeException('Could not create seller payout account: ' . $response->json('message'));
        }

        $subaccount = $response->json('data');

        $seller->update([
            'paystack_subaccount_code' => $subaccount['subaccount_code'],
        ]);

        return $subaccount;
    }

    /**
     * List Nigerian banks (for seller bank setup form).
     */
    public function listBanks(): array
    {
        $response = $this->client()->get('/bank', ['country' => 'nigeria']);
        return $response->json('data', []);
    }

    /**
     * Validate a bank account number before creating subaccount.
     */
    public function resolveAccount(string $accountNumber, string $bankCode): array
    {
        $response = $this->client()->get('/bank/resolve', [
            'account_number' => $accountNumber,
            'bank_code'      => $bankCode,
        ]);

        if ($response->failed()) {
            throw new \RuntimeException('Could not verify bank account. Check details and try again.');
        }

        return $response->json('data');
    }

    // ─── Transfers (manual payouts) ───────────────────────────────────────────

    /**
     * Initiate a bulk transfer to multiple sellers.
     * Used by the admin payout cron.
     */
    public function initiateTransfer(string $recipientCode, int $amountKobo, string $reason): array
    {
        $response = $this->client()->post('/transfer', [
            'source'    => 'balance',
            'amount'    => $amountKobo,
            'recipient' => $recipientCode,
            'reason'    => $reason,
        ]);

        if ($response->failed() || !$response->json('status')) {
            throw new \RuntimeException('Transfer failed: ' . $response->json('message'));
        }

        return $response->json('data');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function buildSplit(Order $order): ?array
    {
        if (!$order->seller->paystack_subaccount_code) return null;

        $platformFeePercent = config('flockr.platform_fee_percent', 5);

        return [
            'type'         => 'percentage',
            'bearer_type'  => 'account',
            'subaccounts'  => [
                [
                    'subaccount' => $order->seller->paystack_subaccount_code,
                    'share'      => 100 - $platformFeePercent,
                ],
            ],
        ];
    }
}
