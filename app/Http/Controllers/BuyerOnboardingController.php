<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BuyerOnboardingController extends Controller
{
    /**
     * GET /onboarding
     */
    public function show(): Response
    {
        // If already completed onboarding, go home
        if ($this->isCompleted()) {
            return Inertia::render('Feed/Index');
        }

        // Regenerate CSRF so the form always has a fresh token
        session()->regenerateToken();

        return Inertia::render('Auth/BuyerOnboarding');
    }

    /**
     * POST /onboarding
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'interests' => 'required|array|min:1|max:15',
            'interests.*' => 'string|max:100',
            'budget' => 'required|string|in:under_5k,5k_20k,20k_50k,above_50k,no_limit',
            'location' => 'nullable|string|max:100',
        ]);

        $user = Auth::user();

        // Merge with any existing preferences (e.g. notification prefs)
        $existing = $user->preferences ?? [];

        $user->update([
            'preferences' => array_merge($existing, [
                'interests'            => $validated['interests'],
                'budget'               => $validated['budget'],
                'onboarding_completed' => true,
                'onboarding_at'        => now()->toISOString(),
            ]),
            // Also update location on the user record itself
            'location' => $validated['location'] ?? $user->location,
        ]);

        return redirect()->route('home')
            ->with('success', 'Your feed is ready! Welcome to Flockr 🎉');
    }

    /**
     * POST /onboarding/skip
     */
    public function skip(): RedirectResponse
    {
        $user = Auth::user();
        $existing = $user->preferences ?? [];

        $user->update([
            'preferences' => array_merge($existing, [
                'onboarding_completed' => true,
                'onboarding_skipped'   => true,
                'onboarding_at'        => now()->toISOString(),
            ]),
        ]);

        return redirect()->route('home');
    }

    private function isCompleted(): bool
    {
        $prefs = Auth::user()->preferences ?? [];
        return !empty($prefs['onboarding_completed']);
    }
}