<?php

namespace App\Http\Controllers;

use App\Services\PaystackService;
use App\Services\StorageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(
        private readonly PaystackService $paystack,
        private readonly StorageService  $storage,
    ) {}

    public function profile(): Response
    {
        $banks = [];
        if (Auth::user()->isSeller()) {
            try { $banks = $this->paystack->listBanks(); } catch (\Throwable) {}
        }
        return Inertia::render('Settings/Profile', ['banks' => $banks]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name'     => 'required|string|max:100',
            'username' => "required|string|max:30|alpha_dash|unique:users,username,{$user->id}",
            'bio'      => 'nullable|string|max:200',
            'location' => 'nullable|string|max:100',
            'phone'    => "nullable|string|max:20|unique:users,phone,{$user->id}",
            'avatar'   => 'nullable|image|max:5120',
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->avatar) $this->storage->delete($user->avatar);
            $validated['avatar'] = $this->storage->uploadAvatar($request->file('avatar'));
        }

        $user->update($validated);

        return back()->with('success', 'Profile updated.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password'      => 'required|current_password',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        Auth::user()->update(['password' => Hash::make($validated['password'])]);

        return back()->with('success', 'Password updated.');
    }

    public function updateBank(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'bank_code'      => 'required|string',
            'account_number' => 'required|string|size:10',
        ]);

        // Verify account number with Paystack
        $account = $this->paystack->resolveAccount($validated['account_number'], $validated['bank_code']);

        // Create subaccount
        $this->paystack->createSubaccount(Auth::user(), $validated['bank_code'], $validated['account_number']);

        return back()->with('success', "Bank account ({$account['account_name']}) connected.");
    }

    public function updateNotifications(Request $request): \Illuminate\Http\JsonResponse
    {
        $prefs = Auth::user()->notification_preferences ?? [];
        foreach ($request->all() as $key => $value) {
            $prefs[$key] = (bool) $value;
        }
        Auth::user()->update(['notification_preferences' => $prefs]);
        return response()->json(['ok' => true]);
    }
}
