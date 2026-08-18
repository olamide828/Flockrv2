<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SuspensionController extends Controller
{
    public function show(): Response|RedirectResponse
    {
        $user = Auth::user();
        if ($user->is_active) {
            return redirect('/');
        }

        $appeal = Report::where('reporter_id', $user->id)
            ->where('reported_id', $user->id)
            ->where('reason', 'like', '[Suspension Appeal]%')
            ->latest()
            ->first();

        return Inertia::render('Auth/Suspended', [
            'suspendedAt' => $user->suspended_at,
            'reason'      => $user->suspension_reason,
            'appeal'      => $appeal ? [
                'status'       => $appeal->status,
                'submitted_at' => $appeal->updated_at,
            ] : null,
        ]);
    }

    public function appeal(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $request->validate(['message' => 'required|string|max:1000']);

        $alreadyPending = Report::where('reporter_id', $user->id)
            ->where('reported_id', $user->id)
            ->where('reason', 'like', '[Suspension Appeal]%')
            ->where('status', 'pending')
            ->exists();

        if ($alreadyPending) {
            return back()->with('error', 'You already have a pending appeal under review.');
        }

        Report::upsertReport(
            reporterId: $user->id,
            reportedId: $user->id,
            reason: '[Suspension Appeal]: ' . $request->message,
        );

        return back()->with('success', 'Appeal submitted. Our team will review it shortly.');
    }
}