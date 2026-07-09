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
     * Terminal event types:
     *   shipment.pickup_scheduled   → order: confirmed
     *   shipment.picked_up          → order: shipped
     *   shipment.in_transit         → order: shipped (already)
     *   shipment.out_for_delivery   → order: shipped
     *   shipment.delivered          → order: delivered
     *   shipment.pickup_failed      → order: pickup_failed
     *   shipment.delivery_failed    → order: delivery_failed
     *   shipment.returned           → order: returned
     */
    public function handle(Request $request): JsonResponse
    {
        // Verify webhook signature from Terminal
        $signature = $request->header('x-terminal-signature');
        $secret    = config('services.terminal.webhook_secret');

        if ($secret && $signature) {
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

        // Map Terminal event to Flockr order status
        $statusMap = [
            'shipment.pickup_scheduled'  => 'confirmed',
            'shipment.picked_up'         => 'shipped',
            'shipment.in_transit'        => 'shipped',
            'shipment.out_for_delivery'  => 'shipped',
            'shipment.delivered'         => 'delivered',
            'shipment.pickup_failed'     => 'pickup_failed',
            'shipment.delivery_failed'   => 'delivery_failed',
            'shipment.returned'          => 'returned',
        ];

        $newStatus = $statusMap[$event] ?? null;

        if ($newStatus) {
            $updates = ['status' => $newStatus];

            // Set delivered_at when delivered
            if ($newStatus === 'delivered') {
                $updates['delivered_at'] = now();
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