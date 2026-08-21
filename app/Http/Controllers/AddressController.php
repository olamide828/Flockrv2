<?php

namespace App\Http\Controllers;

use App\Models\UserAddress;
use App\Services\TerminalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AddressController extends Controller
{
    public function __construct(private readonly TerminalService $terminal) {}

    /**
     * GET /api/addresses
     * List all saved addresses for the authenticated user.
     */
    public function index(): JsonResponse
    {
        $addresses = UserAddress::where('user_id', Auth::id())
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['addresses' => $addresses]);
    }

    /**
     * POST /api/addresses
     * Save a new delivery address (max 5).
     */
    public function store(Request $request): JsonResponse
    {
        $count = UserAddress::where('user_id', Auth::id())->count();
        if ($count >= 5) {
            return response()->json(['message' => 'Maximum of 5 saved addresses allowed.'], 422);
        }

        $validated = $request->validate([
            'label'          => 'required|string|in:Home,Work,Other',
            'recipient_name' => 'required|string|max:100',
            'phone'          => 'required|string|max:20',
            'street'         => 'required|string|max:200',
            'city'           => 'required|string|max:100',
            'state'          => 'required|string|max:100',
            'state_code' => 'nullable|string|max:10',
            'postal_code'    => 'nullable|string|max:20',
            'is_default'     => 'boolean',
        ]);

        // If setting as default, unset others
        if (!empty($validated['is_default'])) {
            UserAddress::where('user_id', Auth::id())->update(['is_default' => false]);
        }

        // First address is always default
        if ($count === 0) {
            $validated['is_default'] = true;
        }

        $address = UserAddress::create([
            ...$validated,
            'user_id' => Auth::id(),
            'country' => 'NG',
        ]);

        return response()->json(['address' => $address], 201);
    }

    /**
     * PUT /api/addresses/{address}
     */
    public function update(Request $request, UserAddress $address): JsonResponse
    {
        abort_unless($address->user_id === Auth::id(), 403);

        $validated = $request->validate([
            'label'          => 'sometimes|string|in:Home,Work,Other',
            'recipient_name' => 'sometimes|string|max:100',
            'phone'          => 'sometimes|string|max:20',
            'street'         => 'sometimes|string|max:200',
            'city'           => 'sometimes|string|max:100',
            'state'          => 'sometimes|string|max:100',
            'state_code' => 'nullable|string|max:10',
            'postal_code'    => 'nullable|string|max:20',
            'is_default'     => 'boolean',
        ]);

        if (!empty($validated['is_default'])) {
            UserAddress::where('user_id', Auth::id())->update(['is_default' => false]);
        }

        $address->update($validated);

        return response()->json(['address' => $address]);
    }

    /**
     * DELETE /api/addresses/{address}
     */
    public function destroy(UserAddress $address): JsonResponse
    {
        abort_unless($address->user_id === Auth::id(), 403);
        $address->delete();

        // If deleted address was default, make most recent the new default
        if ($address->is_default) {
            UserAddress::where('user_id', Auth::id())
                ->latest()
                ->first()
                ?->update(['is_default' => true]);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/addresses/{address}/set-default
     */
    public function setDefault(UserAddress $address): JsonResponse
    {
        abort_unless($address->user_id === Auth::id(), 403);

        UserAddress::where('user_id', Auth::id())->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/shipping/rates
     * Get shipping rates for a given address + seller.
     * Called by checkout modal when buyer selects delivery address.
     */
    public function getRates(Request $request): JsonResponse
{
    $validated = $request->validate([
        'address_id' => 'required|integer|exists:user_addresses,id',
        'seller_id'  => 'required|integer|exists:users,id',
        'items'      => 'nullable|array',
    ]);

    $address = UserAddress::where('id', $validated['address_id'])
        ->where('user_id', Auth::id())
        ->firstOrFail();

    $seller = \App\Models\User::findOrFail($validated['seller_id']);

    if (!$seller->pickup_street) {
        return response()->json([
            'message' => "This seller hasn't set up their pickup address yet. Delivery rates are unavailable.",
        ], 422);
    }

    $pickup = [
        'name'        => $seller->name,
        'phone'       => $seller->phone ?? '08000000000',
        'address'     => $seller->pickup_street,
        'city'        => $seller->pickup_city,
        'state' => $seller->pickup_state_code ?: $seller->pickup_state,
        'country'     => 'NG',
        'postal_code' => $seller->pickup_postal_code ?? '000000',
    ];

    try {
        $rates = $this->terminal->getRates(
            pickup:   $pickup,
            delivery: $address->toTerminalFormat(),
            parcel:   [
                'weight'      => 0.5,
                'items_count' => count($validated['items'] ?? [1]),
                'description' => 'Flockr order package',
            ],
        );
        return response()->json(['rates' => $rates]);
    } catch (\RuntimeException $e) {
        return response()->json(['message' => $e->getMessage()], 422);
    } catch (\Throwable $e) {
        $message = str_contains($e->getMessage(), 'cURL') || str_contains($e->getMessage(), 'Connection')
            ? 'No internet connection. Please check your network and try again.'
            : 'Could not fetch shipping rates. Please try again later.';
        Log::error('getRates failed', ['error' => $e->getMessage()]);
        return response()->json(['message' => $message], 503);
    }
}
}