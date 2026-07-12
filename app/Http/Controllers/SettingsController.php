<?php

namespace App\Http\Controllers;

use App\Services\PaystackService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(
        private readonly PaystackService $paystack,
        private readonly StorageService $storage,
    ) {
    }

    public function profile(): Response
{
    $banks = [];
    if (Auth::user()->isSeller()) {
        try { $banks = $this->paystack->listBanks(); }
        catch (\Throwable $e) { Log::error('Paystack listBanks failed: ' . $e->getMessage()); }
    }

    return Inertia::render('Settings/Profile', [
        'banks'     => $banks,
        'addresses' => \App\Models\UserAddress::where('user_id', Auth::id())
                        ->orderByDesc('is_default')
                        ->orderByDesc('updated_at')
                        ->get(),
        'has_pickup_address'  => !empty(Auth::user()->pickup_street),
    ]);
}

    public function updateProfile(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'username' => "required|string|max:30|alpha_dash|unique:users,username,{$user->id}",
            'bio' => 'nullable|string|max:500',
            'location' => 'nullable|string|max:100',
            'phone' => "nullable|string|max:20|unique:users,phone,{$user->id}",
            'avatar' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'username' => $validated['username'],
            'bio' => $request->has('bio') ? (empty($validated['bio']) ? null : $validated['bio']) : $user->bio,
            'location' => $request->has('location') ? (empty($validated['location']) ? null : $validated['location']) : $user->location,
            'phone' => $request->has('phone') ? (empty($validated['phone']) ? null : $validated['phone']) : $user->phone,
        ];

        if ($request->hasFile('avatar') && $request->file('avatar')->isValid()) {
            if ($user->avatar) {
                try {
                    Storage::disk(config('filesystems.default', 'public'))->delete($user->avatar);
                } catch (\Throwable) {
                }
            }
            $updateData['avatar'] = $this->storage->uploadAvatar($request->file('avatar'));
        }

        $user->update($updateData);

        return back()->with('success', 'Profile updated successfully.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => 'required|current_password',
            'password' => 'required|string|min:8|confirmed',
        ]);

        Auth::user()->update(['password' => Hash::make($request->password)]);
        return back()->with('success', 'Password updated.');
    }

    /**
     * POST /settings/bank
     *
     * What this does:
     * 1. Resolves account number → gets account name from Paystack
     * 2. Creates a Paystack Transfer Recipient (needed to send money later)
     * 3. Creates a Paystack Subaccount (for split payments, optional)
     * 4. Saves bank_name, account_last4, paystack_recipient_code,
     *    paystack_subaccount_code to the user record
     * 5. Redirects back — Inertia reloads the page with fresh auth props
     *    so the ATM card shows immediately
     */
    public function updateBank(Request $request): RedirectResponse
    {
        $request->validate([
            'bank_code' => 'required|string',
            'account_number' => 'required|string|size:10',
        ]);

        $user = Auth::user();

        try {
            // Step 1: Resolve account to get the account name
            $account = $this->paystack->resolveAccount(
                $request->account_number,
                $request->bank_code
            );

            // Step 2: Get bank name from the banks list
            $banks = $this->paystack->listBanks();
            $bankName = collect($banks)->firstWhere('code', $request->bank_code)['name'] ?? 'Nigerian Bank';

            // Step 3: Create Transfer Recipient (needed for actual payouts)
            $recipientCode = $this->paystack->createTransferRecipient(
                name: $account['account_name'],
                accountNumber: $request->account_number,
                bankCode: $request->bank_code,
            );

            // Step 4: Create Subaccount (for split payments on checkout)
            // This can fail independently without breaking the payout flow
            $subaccountCode = null;
            try {
                $subaccountCode = $this->paystack->createSubaccount(
                    $user,
                    $request->bank_code,
                    $request->account_number
                );
            } catch (\Throwable $e) {
                Log::warning('Subaccount creation failed (non-fatal): ' . $e->getMessage());
            }

            // Step 5: Save everything to the user
            $user->update([
                'paystack_recipient_code' => $recipientCode,
                'paystack_subaccount_code' => $subaccountCode ?? $user->paystack_subaccount_code,
                'bank_name' => $bankName,
                'bank_code' => $request->bank_code,
                'account_number' => $request->account_number,
                'account_last4' => substr($request->account_number, -4),
                'account_name' => $account['account_name'],
            ]);

            return back()->with('success', "Bank account ({$account['account_name']}) connected successfully.");

        } catch (\Throwable $e) {
            Log::error('Bank connection failed', ['error' => $e->getMessage()]);
            return back()
                ->withErrors(['account_number' => $e->getMessage()])
                ->withInput();
        }
    }

    public function updateNotifications(Request $request): JsonResponse
    {
        $user = Auth::user();
        $prefs = $user->notification_preferences ?? [];
        foreach ($request->all() as $key => $value) {
            $prefs[$key] = (bool) $value;
        }
        $user->update(['notification_preferences' => $prefs]);
        return response()->json(['ok' => true]);
    }

    public function removeBank(Request $request)
    {
        $user = $request->user();

        $user->update([
            'paystack_subaccount_code' => null,
            'bank_name' => null,
            'account_last4' => null,
        ]);

        return response()->json([
            'success' => true,
        ]);
    }

}