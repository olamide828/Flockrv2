<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

/**
 * The ONLY place wallet money moves. Every call locks the user's row first,
 * so two simultaneous requests (double-tapped payout, escrow job + buyer
 * confirming at the same moment) can never read the same balance.
 */
class WalletService
{
    public function balance(int $userId): float
    {
        return (float) (WalletTransaction::where('user_id', $userId)
            ->orderByDesc('id')
            ->value('balance_after') ?? 0);
    }

    /**
     * @throws \RuntimeException when a debit would overdraw the wallet.
     */
    public function post(
        int $userId,
        string $type,            // credit | debit
        float $amount,
        string $source,          // sale | refund | payout | payout_reversal | adjustment
        ?int $orderId = null,
        ?string $description = null,
        bool $allowNegative = false,
    ): WalletTransaction {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Wallet amount must be positive.');
        }

        return DB::transaction(function () use ($userId, $type, $amount, $source, $orderId, $description, $allowNegative) {
            // Row lock serialises all wallet writes for this user.
            User::whereKey($userId)->lockForUpdate()->firstOrFail();

            $before = $this->balance($userId);
            $after  = $type === 'credit' ? $before + $amount : $before - $amount;

            if ($type === 'debit' && $after < 0 && !$allowNegative) {
                throw new \RuntimeException('Insufficient wallet balance.');
            }

            return WalletTransaction::create([
                'user_id'       => $userId,
                'amount'        => round($amount, 2),
                'type'          => $type,
                'source'        => $source,
                'order_id'      => $orderId,
                'description'   => $description,
                'balance_after' => round($after, 2),
            ]);
        });
    }
}
