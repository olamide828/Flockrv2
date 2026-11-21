<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderTrackingEvent;
use Carbon\Carbon;

/**
 * Single source of truth for an order's tracking timeline and the order summary shape
 * used by Order/Show, Order/Success and Order/Tracking.
 * Courier steps come ONLY from what Terminal actually sent (with Terminal's own timestamps).
 */
class OrderTrackingService
{
    /** Titles for the events we know about; unknown Terminal events fall back to a humanised name. */
    private const TITLES = [
        'order.paid'                => ['Payment confirmed', 'Your seller has been notified.'],
        'order.packed'              => ['Packed & ready', 'Waiting for the courier to pick up.'],
        'order.delivered_confirmed' => ['Receipt confirmed', 'You confirmed delivery.'],
        'order.cancelled'           => ['Order cancelled', null],
        'shipment.created'          => ['Courier booked', 'A courier has been assigned.'],
        'shipment.picked_up'        => ['Picked up by courier', 'Your package left the seller.'],
        'shipment.in_transit'       => ['In transit', 'Your package is on its way.'],
        'shipment.out_for_delivery' => ['Out for delivery', 'The courier is heading to your address.'],
        'shipment.delivered'        => ['Delivered', 'Package delivered.'],
        'shipment.pickup_failed'    => ['Pickup failed', 'The courier could not collect the package. Rescheduling.'],
        'shipment.delivery_failed'  => ['Delivery attempt failed', 'Another attempt will be made.'],
        'shipment.dropped_off'      => ['Handed to courier', 'Your package was dropped off with the courier.'],
        'shipment.returned'         => ['Returned to sender', null],
        'shipment.cancelled'        => ['Shipment cancelled', null],
    ];

    public function log(Order $order, string $event, string $source = 'flockr', ?Carbon $at = null, array $extra = []): void
    {
        $at ??= now();
        $event = str_replace('-', '_', $event);
        [$title, $desc] = self::TITLES[$event] ?? [ucfirst(str_replace(['shipment.', '_', '.'], ['', ' ', ' '], $event)), null];

        try {
            OrderTrackingEvent::firstOrCreate(
                ['order_id' => $order->id, 'dedupe_key' => $event . '@' . $at->format('YmdHis')],
                [
                    'source'      => $source,
                    'event'       => $event,
                    'title'       => $extra['title'] ?? $title,
                    'description' => $extra['description'] ?? $desc,
                    'location'    => $extra['location'] ?? null,
                    'occurred_at' => $at,
                    'payload'     => $extra['payload'] ?? null,
                ]
            );
        } catch (\Throwable) {
            // tracking must never break a payment/webhook flow
        }
    }

    /**
     * Pull Terminal's own event time out of a webhook payload.
     * Terminal sends UTC. When the string has no offset ("2026-11-19T01:20:00") PHP would read it as OUR
     * timezone (Lagos), which shifts every courier step one hour early. So read it as UTC, then convert.
     */
    public function terminalTime(array $data): Carbon
    {
        $candidates = [];
        foreach (['event_time', 'timestamp', 'occurred_at', 'updated_at', 'created_at'] as $k) {
            $candidates[] = $data[$k] ?? null;
            $candidates[] = data_get($data, 'shipment.' . $k);
        }
        foreach ($candidates as $v) {
            if (empty($v)) continue;
            try {
                if (is_numeric($v)) {
                    $t = (float) $v;
                    return Carbon::createFromTimestampUTC((int) ($t > 20000000000 ? $t / 1000 : $t))->setTimezone(config('app.timezone'));
                }
                return Carbon::parse((string) $v, 'UTC')->setTimezone(config('app.timezone'));
            } catch (\Throwable) {}
        }
        return now();
    }

    /** Ordered timeline. Orders that pre-date this feature get one synthesised from their own columns. */
    public function timeline(Order $order): array
    {
        $events = OrderTrackingEvent::where('order_id', $order->id)->orderBy('occurred_at')->orderBy('id')->get();

        if ($events->isEmpty()) {
            $rows = [];
            if ($order->created_at)   $rows[] = ['order.created', 'Order placed', null, $order->created_at, 'flockr'];
            if ($order->paid_at)      $rows[] = ['order.paid', 'Payment confirmed', 'Your seller has been notified.', $order->paid_at, 'flockr'];
            if ($order->shipped_at)   $rows[] = ['shipment.picked_up', 'Picked up by courier', null, $order->shipped_at, 'flockr'];
            if ($order->delivered_at) $rows[] = ['shipment.delivered', 'Delivered', null, $order->delivered_at, 'flockr'];
            if ($order->status === 'cancelled') $rows[] = ['order.cancelled', 'Order cancelled', $order->cancellation_reason, $order->updated_at ?? now(), 'flockr'];
            return array_map(fn ($r) => ['event' => $r[0], 'title' => $r[1], 'description' => $r[2], 'location' => null, 'at' => $r[3]->toIso8601String(), 'source' => $r[4]], $rows);
        }

        $out = [];
        if ($order->created_at) {
            $out[] = ['event' => 'order.created', 'title' => 'Order placed', 'description' => null, 'location' => null, 'at' => $order->created_at->toIso8601String(), 'source' => 'flockr'];
        }
        foreach ($events as $e) {
            $ev = str_replace('-', '_', $e->event);
            // bare "Updated" pings add nothing for the buyer; keep them only if Terminal said something with them
            if (in_array($ev, ['shipment.updated', 'shipment.tracking_updated'], true) && !$e->description && !$e->location) continue;
            $out[] = ['event' => $ev, 'title' => $e->title, 'description' => $e->description, 'location' => $e->location, 'at' => $e->occurred_at->toIso8601String(), 'source' => $e->source];
        }
        if ($order->status === 'cancelled' && !$events->contains('event', 'order.cancelled')) {
            $out[] = ['event' => 'order.cancelled', 'title' => 'Order cancelled', 'description' => $order->cancellation_reason, 'location' => null, 'at' => ($order->updated_at ?? now())->toIso8601String(), 'source' => 'flockr'];
        }
        return $this->sorted($out);
    }

    /** Oldest first; on a tie, our own steps come in their natural order (placed, paid, ...), then the courier's. */
    private function sorted(array $rows): array
    {
        $rank = fn ($e) => match (true) {
            $e === 'order.created' => 0,
            $e === 'order.paid'    => 1,
            $e === 'order.packed'  => 2,
            default                => 3,
        };
        usort($rows, fn ($a, $b) => [strtotime($a['at']), $rank($a['event'])] <=> [strtotime($b['at']), $rank($b['event'])]);
        return $rows;
    }

    /** One order payload for all three buyer pages, so they can never disagree. */
    public function present(Order $order): array
    {
        $order->loadMissing([
            'items.product' => fn ($q) => $q->withTrashed()->select('id', 'name', 'images', 'slug', 'seller_id', 'deleted_at'),
            'seller:id,name,username,avatar,pickup_street,pickup_city,pickup_state',
            'buyer:id,name,email',
            'dispute.messages.user:id,name,username,avatar',
        ]);

        $ship = (float) ($order->courier_fee > 0 ? $order->courier_fee : $order->shipping_fee);

        return array_merge($order->toArray(), [
            'courier_name'    => $order->courier_name ?? $order->courier,
            'courier_ref'     => $order->tracking_number ?: $order->terminal_shipment_id,
            'courier_fee'     => $ship,
            'shipping_fee'    => $ship,
            'discount_amount' => (float) ($order->discount_amount ?? 0),
            'seller'          => $order->seller ? array_merge($order->seller->toArray(), ['avatar_url' => $order->seller->avatar_url, 'verification_type' => $order->seller->verification_type ?? null]) : null,
            'timeline'        => $this->timeline($order),
        ]);
    }
}
