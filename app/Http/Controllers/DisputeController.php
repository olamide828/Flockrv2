<?php

namespace App\Http\Controllers;

use App\Models\Dispute;
use App\Models\DisputeMessage;
use App\Models\Order;
use App\Services\PaystackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DisputeController extends Controller
{
    /**
     * POST /api/orders/{order}/disputes
     * Buyer opens a dispute — this creates both the case (Dispute) and its
     * first message (the buyer's initial description + evidence).
     */
    public function store(Request $request, Order $order): JsonResponse
    {
        if ($order->buyer_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $eligible = ['paid', 'confirmed', 'processing', 'shipped', 'delivered'];
        if (!in_array($order->status, $eligible)) {
            return response()->json(['message' => 'You can only dispute a paid or in-progress order.'], 422);
        }

        if (Dispute::where('order_id', $order->id)->exists()) {
            return response()->json(['message' => 'A dispute already exists for this order.'], 422);
        }

        if ($order->delivered_at && $order->delivered_at->diffInDays(now()) > 7) {
            return response()->json([
                'message' => 'The dispute window for this order has closed (7 days after delivery). Please contact support directly.',
            ], 422);
        }

        $validated = $request->validate([
            'reason'      => 'required|string|max:200',
            'description' => 'required|string|max:1000',
            'photos'      => 'nullable|array|max:3',
            'photos.*'    => 'image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $photoKeys = [];
        if ($request->hasFile('photos')) {
            $disk = config('filesystems.default', 'public');
            foreach ($request->file('photos') as $file) {
                $photoKeys[] = $file->store('disputes/' . now()->format('Y/m'), $disk);
            }
        }

        $validated['video'] = null;
        if ($request->hasFile('video')) {
        $request->validate(['video' => 'file|mimes:mp4,mov,webm|max:20480']); 
        $disk = config('filesystems.default', 'public');
        $photoKeys[] = $request->file('video')->store('disputes/videos/' . now()->format('Y/m'), $disk);
        }

        [$dispute, $message] = DB::transaction(function () use ($order, $validated, $photoKeys) {
            $dispute = Dispute::create([
                'order_id'    => $order->id,
                'buyer_id'    => $order->buyer_id,
                'seller_id'   => $order->seller_id,
                'reason'      => $validated['reason'],
                'description' => $validated['description'],
                'status'      => 'open',
            ]);

            $message = DisputeMessage::create([
                'dispute_id'  => $dispute->id,
                'user_id'     => $order->buyer_id,
                'message'     => $validated['description'],
                'attachments' => !empty($photoKeys) ? $photoKeys : null,
            ]);

            $order->update(['status' => 'disputed']);

            return [$dispute, $message];
        });

        try {
            $order->seller->notify(new \App\Notifications\OrderStatusNotification(
                $order,
                'Dispute opened',
                "A dispute was opened for order #{$order->reference}. Please respond within 48 hours."
            ));
        } catch (\Throwable) {}

        try {
        \App\Models\User::where('role', 'admin')->get()->each(
        fn($admin) => $admin->notify(new \App\Notifications\OrderStatusNotification(
            $order,
            'New dispute opened',
            "Order #{$order->reference} — {$validated['reason']}"
        ))
    );
} catch (\Throwable) {}

        return response()->json([
            'message' => 'Dispute submitted. We\'ll review within 24-48 hours.',
            'dispute' => $dispute->load('messages.user:id,name,avatar'),
        ], 201);
    }

    /**
     * GET /api/disputes/{dispute}
     * Buyer, seller, or admin can view the full thread.
     */
    public function show(Dispute $dispute): JsonResponse
    {
        $userId = Auth::id();
        $isParty = $dispute->buyer_id === $userId || $dispute->seller_id === $userId;
        $isAdmin = Auth::user()->isAdmin();

        if (!$isParty && !$isAdmin) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(
            $dispute->load([
                'order.items.product:id,name,images',
                'buyer:id,name,username,avatar',
                'seller:id,name,username,avatar',
                'messages.user:id,name,username,avatar',
            ])
        );
    }

    /**
     * POST /api/disputes/{dispute}/messages
     * Buyer or seller replies with more detail/evidence. Admins reply via a
     * separate admin-only endpoint below, so a message's author is always
     * unambiguous when rendered in the thread.
     */
    public function reply(Request $request, Dispute $dispute): JsonResponse
    {
        $userId = Auth::id();
        if ($dispute->buyer_id !== $userId && $dispute->seller_id !== $userId) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (in_array($dispute->status, ['resolved_buyer', 'resolved_seller', 'closed'])) {
            return response()->json(['message' => 'This dispute has already been resolved.'], 422);
        }

        $validated = $request->validate([
            'message'  => 'required_without:photos|nullable|string|max:1000',
            'photos'   => 'nullable|array|max:3',
            'photos.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $photoKeys = [];
        if ($request->hasFile('photos')) {
            $disk = config('filesystems.default', 'public');
            foreach ($request->file('photos') as $file) {
                $photoKeys[] = $file->store('disputes/' . now()->format('Y/m'), $disk);
            }
        }

        $validated['video'] = null;
        if ($request->hasFile('video')) {
        $request->validate(['video' => 'file|mimes:mp4,mov,webm|max:20480']); // 20MB
        $disk = config('filesystems.default', 'public');
        $photoKeys[] = $request->file('video')->store('disputes/videos/' . now()->format('Y/m'), $disk);
        }

        $message = DisputeMessage::create([
            'dispute_id'  => $dispute->id,
            'user_id'     => $userId,
            'message'     => $validated['message'] ?? null,
            'attachments' => !empty($photoKeys) ? $photoKeys : null,
        ]);

        $dispute->update(['status' => 'awaiting_admin']);   

        try {
    \App\Models\User::where('role', 'admin')->get()->each(
        fn($admin) => $admin->notify(new \App\Notifications\OrderStatusNotification(
            $dispute->order,
            'New response on dispute',
            "New reply on dispute #{$dispute->id} — needs review"
        ))
    );
} catch (\Throwable) {}

        $otherPartyId = $userId === $dispute->buyer_id ? $dispute->seller_id : $dispute->buyer_id;
        try {
            \App\Models\User::find($otherPartyId)?->notify(new \App\Notifications\OrderStatusNotification(
                $dispute->order,
                'New reply on your dispute',
                "There's a new reply on the dispute for order #{$dispute->order->reference}."
            ));
        } catch (\Throwable) {}

        return response()->json($message->load('user:id,name,username,avatar'), 201);
    }

    /**
     * GET /api/admin/disputes
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = Dispute::with(['buyer:id,name,username,avatar', 'seller:id,name,username,avatar', 'order:id,reference,total,status'])
            ->withCount('messages')
            ->latest();

        if ($request->filled('status') && $request->status !== 'all') {
            $request->status === 'open'
                ? $query->whereNotIn('status', ['resolved_buyer', 'resolved_seller', 'closed'])
                : $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->whereHas('order', fn ($o) => $o->where('reference', 'ilike', "%{$s}%"))
                  ->orWhereHas('buyer', fn ($u) => $u->where('name', 'ilike', "%{$s}%")->orWhere('username', 'ilike', "%{$s}%"))
                  ->orWhereHas('seller', fn ($u) => $u->where('name', 'ilike', "%{$s}%")->orWhere('username', 'ilike', "%{$s}%"));
            });
        }

        $closed = ['resolved_buyer', 'resolved_seller', 'closed'];
        return response()->json([
            'rows'   => $query->paginate(30),
            'counts' => [
                'open'     => Dispute::whereNotIn('status', $closed)->count(),
                'resolved' => Dispute::whereIn('status', $closed)->count(),
                'all'      => Dispute::count(),
            ],
        ]);
    }

    /** GET /api/admin/disputes/{disputeId} — full thread for the admin drawer. */
    public function adminShow(int $disputeId): JsonResponse
    {
        $dispute = Dispute::with([
            'buyer:id,name,username,avatar,email', 'seller:id,name,username,avatar,email',
            'order:id,reference,total,status,paid_at,delivered_at,escrow_released_at,refund_status,refund_error,seller_earning',
            'messages.user:id,name,username,avatar,role',
            'resolvedBy:id,name',
        ])->findOrFail($disputeId);

        return response()->json(['dispute' => $dispute]);
    }

    /** POST /api/admin/disputes/{disputeId}/messages — admin posts into the thread. */
    public function adminReply(Request $request, int $disputeId): JsonResponse
    {
        $data = $request->validate(['message' => 'required|string|max:2000']);
        $dispute = Dispute::findOrFail($disputeId);

        $msg = DisputeMessage::create([
            'dispute_id' => $dispute->id,
            'user_id'    => Auth::id(),
            'message'    => '[Admin] ' . $data['message'],
        ]);
        if ($dispute->status === 'open') $dispute->update(['status' => 'awaiting_seller']);

        \App\Support\Audit::log('dispute.reply', $dispute);
        return response()->json(['message' => 'Reply sent.', 'dispute_message' => $msg->load('user:id,name,username,avatar,role')]);
    }

    /**
     * POST /api/admin/disputes/{dispute}/resolve
     * outcome: 'refund_buyer' | 'release_seller'
     */
    public function resolve(Request $request, Dispute $dispute, PaystackService $paystack): JsonResponse
    {
        $validated = $request->validate([
            'outcome'         => 'required|in:refund_buyer,release_seller',
            'resolution_note' => 'required|string|max:1000',
        ]);

        if (in_array($dispute->status, ['resolved_buyer', 'resolved_seller', 'closed'])) {
            return response()->json(['message' => 'This dispute has already been resolved.'], 422);
        }

        $order = $dispute->order;

        DB::transaction(function () use ($dispute, $order, $validated) {
            if ($validated['outcome'] === 'refund_buyer') {
                $order->update(['status' => 'refunded']);
                $order->reverseSellerCredit("Dispute #{$dispute->id} resolved in buyer's favor");
            } else {
                $order->update([
                    'status'       => 'delivered',
                    'delivered_at' => $order->delivered_at ?? now(),
                ]);
                $order->refresh()->releaseEscrow("Dispute #{$dispute->id} resolved in seller's favor");
            }

            $dispute->update([
                'status'          => $validated['outcome'] === 'refund_buyer' ? 'resolved_buyer' : 'resolved_seller',
                'resolution_note' => $validated['resolution_note'],
                'resolved_by'     => Auth::id(),
                'resolved_at'     => now(),
            ]);

            DisputeMessage::create([
                'dispute_id' => $dispute->id,
                'user_id'    => Auth::id(),
                'message'    => "[Admin resolution — {$validated['outcome']}] " . $validated['resolution_note'],
            ]);
        });

        \App\Support\Audit::log('dispute.resolve', $dispute, ['outcome' => $validated['outcome']]);

        $refund = null;
        if ($validated['outcome'] === 'refund_buyer') {
            $refund = app(\App\Services\RefundService::class)->refund($order->fresh());
        }

        try {
            $verdict = $validated['outcome'] === 'refund_buyer' ? 'Decision: the buyer is refunded.' : 'Decision: the payment is released to the seller.';
            $dispute->buyer->notify(new \App\Notifications\OrderStatusNotification($order, 'Your dispute was resolved', $verdict . ' ' . $validated['resolution_note']));
            $dispute->seller->notify(new \App\Notifications\OrderStatusNotification($order, 'A dispute was resolved', $verdict . ' ' . $validated['resolution_note']));
        } catch (\Throwable) {}

        return response()->json([
            'message' => 'Dispute resolved.' . ($refund && !$refund['ok'] ? ' ⚠ ' . $refund['message'] . ' You can retry the refund from the order page.' : ''),
            'refund'  => $refund,
            'dispute' => $dispute->fresh(),
        ]);
    }
}