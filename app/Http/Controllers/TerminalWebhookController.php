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
        // ── Who is calling? ──────────────────────────────────────────────────────
        // Terminal's dashboard only has a URL box, so the simplest protection is a secret in the URL itself:
        //   https://your-domain/api/webhooks/terminal?token=<TERMINAL_WEBHOOK_TOKEN>
        // A signature (TERMINAL_WEBHOOK_SECRET) is also honoured if Terminal sends one.
        $secret    = config('services.terminal.webhook_secret');
        $token     = config('flockr_shipping.webhook_token');
        $signature = $request->header('x-terminal-signature');
        $trusted   = false;

        if ($secret && $signature) {
            if (!hash_equals(hash_hmac('sha256', $request->getContent(), $secret), $signature)) {
                Log::warning('Terminal webhook: signature present but wrong');
                return response()->json(['ok' => false], 401);
            }
            $trusted = true;
        }
        if (!$trusted && $token) {
            if (!hash_equals((string) $token, (string) $request->query('token'))) {
                Log::warning('Terminal webhook: wrong or missing token in the URL');
                return response()->json(['ok' => false], 401);
            }
            $trusted = true;
        }
        // Neither configured: still accepted (so tracking never silently stops), but see "verify" below.

        $event = (string) ($request->input('event') ?? $request->input('type') ?? '');
        $data  = $request->input('data');
        if (!is_array($data)) $data = $request->all();

        Log::info('Terminal webhook received', ['event' => $event, 'trusted' => $trusted, 'data' => $data]);

        // Terminal has sent the shipment id under a few names over time
        $shipmentId = $data['shipment_id'] ?? data_get($data, 'shipment.shipment_id') ?? data_get($data, 'shipment.id') ?? $data['id'] ?? null;
        if (!$shipmentId) {
            return response()->json(['ok' => true]); // ignore unknown events
        }

        // Find order by Terminal shipment ID

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

        // Understands "shipment.in_transit", "In transit", "shipment.delivered", status words, etc.
        $newStatus = $this->mapStatus($event, $data);

        // Without a token/signature anyone could post a fake "delivered" (it starts the seller's payout clock),
        // so in that case only accept "delivered" if Terminal itself confirms it.
        if (!$trusted && $newStatus === 'delivered') {
            try {
                $confirmed = stripos(json_encode(app(\App\Services\TerminalService::class)->trackShipment((string) $shipmentId)), 'deliver') !== false;
            } catch (\Throwable) { $confirmed = false; }
            if (!$confirmed) {
                Log::warning('Terminal webhook: unverified "delivered" ignored', ['order' => $order->reference]);
                $newStatus = null;
            }
        }

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

            $moved = Order::where('id', $order->id)
                ->whereNotIn('status', ['cancelled', 'refunded', 'disputed'])
                ->update($updates + ['updated_at' => now()]);
            if (!$moved) {
                Log::info('Terminal webhook: order was closed meanwhile, event ignored', ['order' => $order->reference, 'event' => $event]);
                return response()->json(['ok' => true]);
            }
            $order->refresh();

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

    /** Map whatever Terminal calls the event to one of our order statuses (null = just record it). */
    private function mapStatus(string $event, array $data): ?string
    {
        $hay = strtolower($event . ' ' . (is_string($data['status'] ?? null) ? $data['status'] : ''));
        $hay = str_replace(['-', '.', ' '], '_', $hay);

        if (str_contains($hay, 'fail'))   return str_contains($hay, 'pickup') ? 'pickup_failed' : 'delivery_failed';
        if (str_contains($hay, 'return')) return 'returned';
        if (str_contains($hay, 'out_for_deliver')) return 'shipped';
        if (str_contains($hay, 'deliver')) return 'delivered';
        if (str_contains($hay, 'transit') || str_contains($hay, 'picked') || str_contains($hay, 'pick_up')) return 'shipped';
        return null;   // created / confirmed / anything else: shown on the timeline, no status change
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