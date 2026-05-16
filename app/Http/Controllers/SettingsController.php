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

    /**
     * POST /settings/profile
     *
     * ROOT CAUSE OF BIO/PHONE/LOCATION NOT PERSISTING:
     * The form was using `useForm` with `post()` which sends as JSON by default.
     * But the avatar file needs multipart/form-data.
     * When `forceFormData: true` is set, empty fields send as empty strings "",
     * and `$validated['bio'] ?? $user->bio` returns "" not null,
     * which overwrites existing data with empty string.
     *
     * FIX: Use `$request->input()` with explicit fallback to existing value,
     * and treat empty string as null for optional fields.
     */
    public function updateProfile(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name'     => 'required|string|max:100',
            'username' => "required|string|max:30|alpha_dash|unique:users,username,{$user->id}",
            'bio'      => 'nullable|string|max:200',
            'location' => 'nullable|string|max:100',
            'phone'    => "nullable|string|max:20|unique:users,phone,{$user->id}",
            'avatar'   => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        // FIX: Treat empty string as null, fall back to existing value
        $bio      = !empty($validated['bio'])      ? $validated['bio']      : ($request->has('bio')      ? null : $user->bio);
        $location = !empty($validated['location']) ? $validated['location'] : ($request->has('location') ? null : $user->location);
        $phone    = !empty($validated['phone'])    ? $validated['phone']    : ($request->has('phone')    ? null : $user->phone);

        // FIX: If the field was submitted but empty, save null (user cleared it intentionally)
        // If the field was NOT submitted (e.g. partial form), keep existing value
        $updateData = [
            'name'     => $validated['name'],
            'username' => $validated['username'],
            'bio'      => $request->has('bio')      ? (empty($validated['bio'])      ? null : $validated['bio'])      : $user->bio,
            'location' => $request->has('location') ? (empty($validated['location']) ? null : $validated['location']) : $user->location,
            'phone'    => $request->has('phone')    ? (empty($validated['phone'])    ? null : $validated['phone'])    : $user->phone,
        ];

        // Only update avatar if a new file was actually uploaded
        if ($request->hasFile('avatar') && $request->file('avatar')->isValid()) {
            if ($user->avatar) {
                try {
                    Storage::disk(config('filesystems.default', 'public'))->delete($user->avatar);
                } catch (\Throwable) {}
            }
            $updateData['avatar'] = $this->storage->uploadAvatar($request->file('avatar'));
        }
        // avatar NOT in updateData if no file → existing avatar preserved

        $user->update($updateData);

        return back()->with('success', 'Profile updated successfully.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => 'required|current_password',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        Auth::user()->update(['password' => Hash::make($request->password)]);
        return back()->with('success', 'Password updated.');
    }

    public function updateBank(Request $request): RedirectResponse
    {
        $request->validate([
            'bank_code'      => 'required|string',
            'account_number' => 'required|string|size:10',
        ]);

        try {
            $account = $this->paystack->resolveAccount($request->account_number, $request->bank_code);
            $this->paystack->createSubaccount(Auth::user(), $request->bank_code, $request->account_number);
            return back()->with('success', "Bank account ({$account['account_name']}) connected.");
        } catch (\Throwable $e) {
            return back()->withErrors(['account_number' => $e->getMessage()]);
        }
    }

    public function updateNotifications(Request $request): JsonResponse
    {
        $user  = Auth::user();
        $prefs = $user->notification_preferences ?? [];
        foreach ($request->all() as $key => $value) {
            $prefs[$key] = (bool) $value;
        }
        $user->update(['notification_preferences' => $prefs]);
        return response()->json(['ok' => true]);
    }
}