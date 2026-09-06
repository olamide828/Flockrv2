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

        $message = DisputeMessage::create([
            'dispute_id'  => $dispute->id,
            'user_id'     => $userId,
            'message'     => $validated['message'] ?? null,
            'attachments' => !empty($photoKeys) ? $photoKeys : null,
        ]);

        $dispute->update(['status' => 'awaiting_admin']);

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
        $query = Dispute::with(['buyer:id,name,username', 'seller:id,name,username', 'order:id,reference,total'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate(30));
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
                $order->update(['status' => 'delivered']);
                $order->releaseEscrow("Dispute #{$dispute->id} resolved in seller's favor");
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

        if ($validated['outcome'] === 'refund_buyer' && $order->paystack_reference) {
            try {
                $paystack->refundTransaction($order->paystack_reference, (float) $order->total);
            } catch (\Throwable $e) {
                Log::error('Dispute refund via Paystack failed', ['dispute' => $dispute->id, 'error' => $e->getMessage()]);
            }
        }

        try {
            $dispute->buyer->notify(new \App\Notifications\OrderStatusNotification($order, 'Dispute resolved', $validated['resolution_note']));
            $dispute->seller->notify(new \App\Notifications\OrderStatusNotification($order, 'Dispute resolved', $validated['resolution_note']));
        } catch (\Throwable) {}

        return response()->json(['message' => 'Dispute resolved.', 'dispute' => $dispute->fresh()]);
    }
}