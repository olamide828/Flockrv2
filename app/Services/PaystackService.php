<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaystackService
{
    private string $secretKey;
    private string $baseUrl = 'https://api.paystack.co';

    public function __construct()
    {
        $this->secretKey = config('services.paystack.secret_key');
    }

    private function headers(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->secretKey,
            'Content-Type'  => 'application/json',
        ];
    }

    // ─── Banks ────────────────────────────────────────────────────────────────

    public function listBanks(): array
    {
        $response = Http::withHeaders($this->headers())
            ->get("{$this->baseUrl}/bank", ['country' => 'nigeria', 'perPage' => 100]);

        if ($response->failed()) {
            throw new \RuntimeException('Failed to fetch banks from Paystack.');
        }

        return $response->json('data') ?? [];
    }

    // ─── Account resolution ───────────────────────────────────────────────────

    /**
     * Resolve a NUBAN account number to get the account name.
     * This is what verifies the seller's bank details are correct.
     */
    public function resolveAccount(string $accountNumber, string $bankCode): array
    {
        $response = Http::withHeaders($this->headers())
            ->get("{$this->baseUrl}/bank/resolve", [
                'account_number' => $accountNumber,
                'bank_code'      => $bankCode,
            ]);

        if ($response->failed()) {
            $message = $response->json('message') ?? 'Could not resolve account. Check your account number and bank.';
            throw new \RuntimeException($message);
        }

        return $response->json('data');
    }

    // ─── Transfer Recipient ───────────────────────────────────────────────────

    /**
     * Create a Transfer Recipient on Paystack.
     * This is REQUIRED before you can send money to a seller.
     * Save the returned recipient_code on the user.
     */
    public function createTransferRecipient(
        string $name,
        string $accountNumber,
        string $bankCode,
    ): string {
        $response = Http::withHeaders($this->headers())
            ->post("{$this->baseUrl}/transferrecipient", [
                'type'           => 'nuban',
                'name'           => $name,
                'account_number' => $accountNumber,
                'bank_code'      => $bankCode,
                'currency'       => 'NGN',
            ]);

        if ($response->failed()) {
            $message = $response->json('message') ?? 'Failed to create transfer recipient.';
            throw new \RuntimeException($message);
        }

        return $response->json('data.recipient_code');
    }

    // ─── Subaccount ───────────────────────────────────────────────────────────

    /**
     * Create a Paystack Subaccount for split payments.
     * This allows Paystack to automatically split payments between
     * your account and the seller's account on each transaction.
     * Returns the subaccount_code.
     */
    public function createSubaccount(User $user, string $bankCode, string $accountNumber): string
    {
        $platformFeePercent = config('flockr.platform_fee_percent', 5);
        $sellerPercent      = 100 - $platformFeePercent;

        $response = Http::withHeaders($this->headers())
            ->post("{$this->baseUrl}/subaccount", [
                'business_name'      => $user->name,
                'settlement_bank'    => $bankCode,
                'account_number'     => $accountNumber,
                'percentage_charge'  => $sellerPercent,
                'description'        => "Flockr seller: @{$user->username}",
            ]);

        if ($response->failed()) {
            $message = $response->json('message') ?? 'Failed to create subaccount.';
            throw new \RuntimeException($message);
        }

        return $response->json('data.subaccount_code');
    }

    // ─── Transfers (Payouts) ──────────────────────────────────────────────────

    /**
     * Initiate a bank transfer to a seller.
     *
     * Prerequisites:
     *  - Seller must have paystack_recipient_code saved (from createTransferRecipient)
     *  - Your Paystack account must have Transfers enabled
     *  - Your Paystack balance must have sufficient funds
     *
     * In TEST MODE: use test secret key, transfers are simulated.
     * In LIVE MODE: real money is sent to the seller's bank account.
     *
     * Returns the Paystack transfer reference.
     */
    public function initiateTransfer(
        string $recipientCode,
        float  $amount,         // in Naira (we convert to kobo)
        string $reason = 'Flockr seller payout',
        string $reference = '',
    ): array {
        $amountKobo = (int) round($amount * 100);
        $ref        = $reference ?: 'FLK-PAY-' . now()->format('YmdHis') . '-' . strtoupper(substr(md5(uniqid()), 0, 6));

        $response = Http::withHeaders($this->headers())
            ->post("{$this->baseUrl}/transfer", [
                'source'    => 'balance',
                'amount'    => $amountKobo,
                'recipient' => $recipientCode,
                'reason'    => $reason,
                'reference' => $ref,
            ]);

        if ($response->failed()) {
            $message = $response->json('message') ?? 'Transfer initiation failed.';
            Log::error('Paystack transfer failed', [
                'recipient' => $recipientCode,
                'amount'    => $amount,
                'response'  => $response->json(),
            ]);
            throw new \RuntimeException($message);
        }

        return $response->json('data');
    }

    // ─── Transactions ─────────────────────────────────────────────────────────

    /**
     * Initialize a payment transaction.
     * Returns authorization_url, access_code, reference.
     */
    public function initializeTransaction(Order $order): array
{
    $amountKobo  = (int) round($order->total * 100);
    $callbackUrl = route('orders.callback');

    $payload = [
        'email'        => $order->buyer->email,
        'amount'       => $amountKobo,
        'reference'    => $order->reference,
        'callback_url' => $callbackUrl,
        'metadata'     => [
            'order_id'  => $order->id,
            'buyer_id'  => $order->buyer_id,
            'seller_id' => $order->seller_id,
            'custom_fields' => [
                ['display_name' => 'Order Reference', 'variable_name' => 'order_reference', 'value' => $order->reference],
                ['display_name' => 'Seller',          'variable_name' => 'seller',          'value' => "@{$order->seller->username}"],
            ],
        ],
    ];

    // ESCROW: the full charge goes to Flockr's main Paystack balance.
    // The seller's share is released later via Order::releaseEscrow(),
    // which uses PaystackService::initiateTransfer(). Do NOT re-add
    // 'subaccount' / 'bearer' / 'transaction_charge' here — that would
    // auto-settle the seller before delivery is confirmed.

    $response = Http::withHeaders($this->headers())
        ->post("{$this->baseUrl}/transaction/initialize", $payload);

    if ($response->failed()) {
        $message = $response->json('message') ?? 'Failed to initialize payment.';
        throw new \RuntimeException($message);
    }

    return $response->json('data');
}
    public function initializeGenericTransaction(string $email, float $amountNaira, string $reference, string $callbackUrl, array $metadata = []): array
{
    $response = Http::withHeaders($this->headers())
        ->post("{$this->baseUrl}/transaction/initialize", [
            'email'        => $email,
            'amount'       => (int) round($amountNaira * 100),
            'reference'    => $reference,
            'callback_url' => $callbackUrl,
            'metadata'     => $metadata,
        ]);

    if ($response->failed()) {
        throw new \RuntimeException($response->json('message') ?? 'Failed to initialize payment.');
    }

    return $response->json('data');
}

    /**
     * Verify a transaction by reference.
     */
    public function verifyTransaction(string $reference): array
    {
        $response = Http::withHeaders($this->headers())
            ->get("{$this->baseUrl}/transaction/verify/{$reference}");

        if ($response->failed()) {
            throw new \RuntimeException('Failed to verify transaction.');
        }

        return $response->json('data');
    }

    /**
     * Verify Paystack webhook signature.
     */
    public function verifyWebhook(string $payload, string $signature): bool
    {
        $expected = hash_hmac('sha512', $payload, $this->secretKey);
        return hash_equals($expected, $signature);
    }


    public function refundTransaction(string $reference, ?float $amountNaira = null): array
{
    $payload = ['transaction' => $reference];
    if ($amountNaira !== null) {
        $payload['amount'] = (int) round($amountNaira * 100); // partial refund, optional
    }

    $response = Http::withHeaders($this->headers())
        ->post("{$this->baseUrl}/refund", $payload);

    if ($response->failed()) {
        throw new \RuntimeException($response->json('message') ?? 'Refund failed.');
    }

    return $response->json('data');
}

}