<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Log;

/**
 * One path for "give the buyer their money back".
 * Safe to call repeatedly: it never refunds twice, and a failed attempt is
 * recorded on the order (refund_status = failed) so admin can retry it.
 */
class RefundService
{
    public function __construct(private readonly PaystackService $paystack) {}

    /** Amount Flockr owes the buyer back for this order (their whole share of the charge). */
    public function amountFor(Order $order): float
    {
        return (float) $order->total;
    }

    /**
     * @return array{ok:bool,message:string}
     */
    public function refund(Order $order): array
    {
        if (!$order->paid_at || !$order->paystack_reference) {
            return ['ok' => true, 'message' => 'Order was never paid — nothing to refund.'];
        }
        if ($order->refund_status === 'succeeded') {
            return ['ok' => true, 'message' => 'Already refunded.'];
        }

        $amount = $this->amountFor($order);
        if ($amount <= 0) {
            $order->update(['refund_status' => 'succeeded', 'refunded_at' => now()]);
            return ['ok' => true, 'message' => 'Nothing to refund (zero total).'];
        }

        try {
            $this->paystack->refundTransaction($order->paystack_reference, $amount);
            $order->update(['refund_status' => 'succeeded', 'refund_error' => null, 'refunded_at' => now()]);
            return ['ok' => true, 'message' => '₦' . number_format($amount, 2) . ' refunded to the buyer.'];
        } catch (\Throwable $e) {
            Log::error('Refund failed', ['order' => $order->reference, 'error' => $e->getMessage()]);
            $order->update(['refund_status' => 'failed', 'refund_error' => mb_substr($e->getMessage(), 0, 500)]);
            return ['ok' => false, 'message' => 'Paystack refund failed: ' . $e->getMessage()];
        }
    }
}
