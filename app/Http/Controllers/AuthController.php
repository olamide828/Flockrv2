<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function loginForm(): Response
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors([
                'email' => 'These credentials do not match our records.',
            ])->onlyInput('email');
        }

        $request->session()->regenerate();
        return $this->redirectByRole(Auth::user());
    }

    public function registerForm(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function register(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'username' => 'required|string|max:30|alpha_dash|unique:users,username',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|in:buyer,seller',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => strtolower($validated['username']),
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        Auth::login($user);

        // IMPORTANT: regenerate session ONCE here, before any redirect
        $request->session()->regenerate();

        if ($user->role === 'seller') {
            return redirect()->route('seller.onboarding');
        }

        // Buyers go to interest onboarding
        return redirect()->route('buyer.onboarding');
    }

    public function sellerOnboarding(): Response
    {
        if (!Auth::check() || Auth::user()->role !== 'seller') {
            abort(403);
        }

        // Regenerate CSRF token — this is what fixes the 419
        // The session was already regenerated on login/register,
        // but the CSRF token can get stale on redirect chains.
        session()->regenerateToken();

        return Inertia::render('Auth/SellerOnboarding');
    }

    public function sellerOnboardingStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'store_name' => 'required|string|max:100',
            'business_type' => 'required|in:individual,registered_business',
            'product_categories' => 'required|array|min:1|max:3',   // ← array now
            'product_categories.*' => 'string|max:100',
            'description' => 'required|string|max:500',
            'location' => 'required|string|max:100',
            'whatsapp' => 'nullable|string|max:20',
            'pickup_street'      => 'nullable|string|max:200',
    'pickup_city'        => 'nullable|string|max:100',
    'pickup_state'       => 'nullable|string|max:100',
    'pickup_state_code'  => 'nullable|string|max:10',
    'pickup_postal_code' => 'nullable|string|max:20',
        ]);

        $user = Auth::user();
        $existing = $user->preferences ?? [];

        $user->update([
            'name' => $validated['store_name'],
            'bio' => $validated['description'],
            'location' => $validated['location'],
            'phone' => $validated['whatsapp'] ?? $user->phone,
            // Store seller store info in preferences
            'preferences' => array_merge($existing, [
                'store_name' => $validated['store_name'],
                'business_type' => $validated['business_type'],
                'product_categories' => $validated['product_categories'],
                'onboarding_completed' => true,
                'onboarding_at' => now()->toISOString(),
            ]),
            'pickup_street'      => $validated['pickup_street']      ?? null,
    'pickup_city'        => $validated['pickup_city']        ?? null,
    'pickup_state'       => $validated['pickup_state']       ?? null,
    'pickup_postal_code' => $validated['pickup_postal_code'] ?? null,
        ]);

        return redirect()->route('seller.dashboard')
            ->with('success', 'Welcome to Flockr! Your seller account is ready. 🎉');
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/');
    }

    // ── Password Reset ────────────────────────────────────────────────────────

    public function forgotForm(): Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function forgotPassword(Request $request): RedirectResponse
    {
        $request->validate(['email' => 'required|email']);
        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? back()->with('status', 'We\'ve sent a password reset link to your email!')
            : back()->withErrors(['email' => __($status)]);
    }



    public function resetForm(Request $request, string $token): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => $request->email,
        ]);
    }

    public function resetPassword(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('status', __($status))
            : back()->withErrors(['email' => __($status)]);
    }

    // Terms of service and privacy policy pages are static, so we can just return Inertia views
    public function terms(): Response
    {
        return Inertia::render('Auth/Terms');
    }

    public function privacy(): Response
    {
        return Inertia::render('Auth/Privacy');
    }

    // ── Social Auth ───────────────────────────────────────────────────────────

    public function redirectToProvider(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, ['google', 'facebook']), 404);
        return Socialite::driver($provider)->redirect();
    }

    public function handleProviderCallback(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, ['google', 'facebook']), 404);

        try {
            $socialUser = Socialite::driver($provider)->user();
        } catch (\Exception) {
            return redirect()->route('login')
                ->withErrors(['email' => 'Social login failed. Please try again.']);
        }

        $user = User::firstOrCreate(
            ['email' => $socialUser->getEmail()],
            [
                'name' => $socialUser->getName(),
                'username' => $this->generateUsername($socialUser->getName()),
                'password' => Hash::make(Str::random(32)),
                'avatar' => $socialUser->getAvatar(),
                'email_verified_at' => now(),
                'role' => 'buyer',
            ]
        );

        Auth::login($user, remember: true);
        return $this->redirectByRole($user);
    }

    private function redirectByRole(User $user): RedirectResponse
    {
        return match ($user->role) {
            'admin' => redirect()->route('admin.dashboard'),
            'seller' => redirect()->route('seller.dashboard'),
            default => redirect()->route('home'),
        };
    }

    private function generateUsername(string $name): string
    {
        $base = strtolower(Str::slug($name, ''));
        $username = $base;
        $i = 1;
        while (User::where('username', $username)->exists()) {
            $username = $base . $i++;
        }
        return $username;
    }
}

