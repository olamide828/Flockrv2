<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TerminalWebhookController extends Controller
{
    /**
     * POST /api/webhooks/terminal
     *
     * Terminal Africa sends shipment status updates here.
     * Map their events to Flockr order statuses.
     *
     */
    public function handle(Request $request): JsonResponse
    {
        // Verify webhook signature from Terminal
        $signature = $request->header('x-terminal-signature');
        $secret    = config('services.terminal.webhook_secret');

        // In production a webhook secret MUST be configured; never accept unsigned calls there.
        if (app()->environment('production') && !$secret) {
            Log::error('Terminal webhook rejected: TERMINAL_WEBHOOK_SECRET is not set');
            return response()->json(['ok' => false], 503);
        }

        if ($secret) {
            if (!$signature) {
                Log::warning('Terminal webhook: missing signature');
                return response()->json(['ok' => false], 401);
            }
            $expected = hash_hmac('sha256', $request->getContent(), $secret);
            if (!hash_equals($expected, $signature)) {
                Log::warning('Terminal webhook: invalid signature');
                return response()->json(['ok' => false], 401);
            }
        }

        $event = $request->input('event');
        $data  = $request->input('data', []);

        Log::info('Terminal webhook received', ['event' => $event, 'data' => $data]);

        // Find order by Terminal shipment ID
        $shipmentId = $data['shipment_id'] ?? $data['id'] ?? null;
        if (!$shipmentId) {
            return response()->json(['ok' => true]); // ignore unknown events
        }

        $order = Order::where('terminal_shipment_id', $shipmentId)->first();
        if (!$order) {
            // Try by reference in metadata
            $reference = $data['metadata']['order_reference'] ?? null;
            if ($reference) {
                $order = Order::where('reference', $reference)->first();
            }
        }

        if (!$order) {
            Log::warning('Terminal webhook: order not found for shipment', ['shipment_id' => $shipmentId]);
            return response()->json(['ok' => true]);
        }

        // Record EVERY courier event with Terminal's own timestamp (unmapped events included),
        // so the tracking page shows exactly what Terminal reported — nothing invented.
        $tracking = app(\App\Services\OrderTrackingService::class);
        $eventAt  = $tracking->terminalTime(is_array($data) ? $data : []);
        $tracking->log($order, (string) $event, 'terminal', $eventAt, [
            'description' => $data['description'] ?? $data['status_description'] ?? $data['message'] ?? null,
            'location'    => $data['location'] ?? $data['current_location'] ?? null,
            'title'       => $data['title'] ?? null,
            'payload'     => $data,
        ]);

        // Names must match the events registered in terminal:register-webhook (underscores).
        $statusMap = [
            'shipment.picked_up'        => 'shipped',
            'shipment.in_transit'       => 'shipped',
            'shipment.out_for_delivery' => 'shipped',
            'shipment.delivered'        => 'delivered',
            'shipment.pickup_failed'    => 'pickup_failed',
            'shipment.delivery_failed'  => 'delivery_failed',
            'shipment.returned'         => 'returned',
        ];

$newStatus = $statusMap[$event] ?? null;

if ($event === 'shipment.cancelled' && $order) {
    Log::warning('Terminal webhook: shipment cancelled by courier', ['order' => $order->reference]);
    try {
        $order->seller->notify(new \App\Notifications\OrderStatusNotification(
            $order, 'Shipment cancelled', "Terminal cancelled the shipment for order #{$order->reference}. Please review and reschedule."
        ));
    } catch (\Throwable) {}
}

        // Never let a late/duplicate courier event drag an order backwards or revive a closed one.
        $rank = ['pending' => 0, 'paid' => 1, 'confirmed' => 2, 'processing' => 3, 'pickup_failed' => 3, 'shipped' => 4, 'delivery_failed' => 4, 'delivered' => 5];
        if (in_array($order->status, ['cancelled', 'refunded', 'disputed'])
            || ($order->status === 'delivered' && $newStatus !== 'returned')
            || (isset($rank[$order->status], $rank[$newStatus]) && $rank[$newStatus] < $rank[$order->status]
                && !in_array($newStatus, ['pickup_failed', 'delivery_failed', 'returned']))) {
            Log::info('Terminal webhook: ignored out-of-order event', ['order' => $order->reference, 'event' => $event, 'status' => $order->status]);
            return response()->json(['ok' => true]);
        }

        if ($newStatus) {
            $updates = ['status' => $newStatus];

            // Set delivered_at when delivered
            if ($newStatus === 'delivered') {
                $updates['delivered_at'] = $eventAt;
            }
            if ($newStatus === 'shipped' && !$order->shipped_at) {
                $updates['shipped_at'] = $eventAt;
            }

            // Set tracking number if provided
            if (!empty($data['tracking_number'])) {
                $updates['tracking_number'] = $data['tracking_number'];
            }

            $order->update($updates);

            // Notify buyer of status change
            try {
                $this->notifyBuyer($order, $newStatus, $event);
            } catch (\Throwable $e) {
                Log::warning('Terminal webhook: buyer notification failed', ['error' => $e->getMessage()]);
            }

            Log::info("Terminal webhook: order {$order->reference} → {$newStatus}");
        }

        return response()->json(['ok' => true]);
    }

    private function notifyBuyer(Order $order, string $status, string $event): void
    {
        $messages = [
            'confirmed'       => ['title' => 'Rider on the way!',         'body' => "A courier is heading to pick up your order #{$order->reference}."],
            'shipped'         => ['title' => 'Order picked up!',           'body' => "Your order #{$order->reference} has been picked up and is on its way."],
            'delivered'       => ['title' => 'Order delivered! 🎉',        'body' => "Your order #{$order->reference} has been delivered. How was it?"],
            'pickup_failed'   => ['title' => 'Pickup issue',               'body' => "There was an issue picking up order #{$order->reference}. We're working on rescheduling."],
            'delivery_failed' => ['title' => 'Delivery attempt failed',    'body' => "Delivery for order #{$order->reference} was unsuccessful. We'll try again."],
            'returned'        => ['title' => 'Order returned',             'body' => "Order #{$order->reference} was returned. Please contact support."],
        ];

        $msg = $messages[$status] ?? null;
        if (!$msg) return;

        $order->buyer->notify(new \App\Notifications\OrderStatusNotification($order, $msg['title'], $msg['body']));

        // Also notify seller on pickup failure so they know to reschedule
        if ($status === 'pickup_failed') {
            $order->seller->notify(new \App\Notifications\OrderStatusNotification(
                $order,
                'Courier pickup failed',
                "A rider couldn't reach you for order #{$order->reference}. Please be available for the rescheduled pickup."
            ));
        }
    }
}