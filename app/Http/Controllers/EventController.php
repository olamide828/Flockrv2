<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EventController extends Controller
{
    /**
     * GET /api/events — currently active + upcoming, for the discovery page.
     */
   public function index(): JsonResponse
{
    $active = Event::where('status', 'active')
        ->where('ends_at', '>=', now())
        ->orderBy('ends_at')
        ->withCount('participants')
        ->get()
        ->each(fn($e) => $e->state = 'live');

    $upcoming = Event::where('status', 'scheduled')
        ->where('starts_at', '>', now())
        ->orderBy('starts_at')
        ->withCount('participants')
        ->get()
        ->each(fn($e) => $e->state = 'upcoming');

    return response()->json($active->concat($upcoming)->values());
}

    /**
     * GET /api/events/{event} — single event with the seller's own
     * participation status (if authenticated as a seller).
     */
    public function show(Event $event): JsonResponse
    {
        $participation = Auth::check()
            ? EventParticipant::where('event_id', $event->id)->where('seller_id', Auth::id())->first()
            : null;

        return response()->json([
            'event'         => $event->loadCount('participants'),
            'participation' => $participation,
        ]);
    }

    /**
     * POST /api/events/{event}/join — seller opts in with a chosen discount tier.
     */
    public function join(Request $request, Event $event): JsonResponse
    {
        if (Auth::user()->role !== 'seller') {
            return response()->json(['message' => 'Only sellers can join events.'], 403);
        }

        if (!in_array($event->status, ['draft', 'scheduled'])) {
            return response()->json(['message' => 'This event is not open for joining.'], 422);
        }

        $validated = $request->validate([
            'discount_percent' => 'required|integer',
        ]);

        if (!in_array($validated['discount_percent'], $event->discount_tiers ?? [])) {
            return response()->json(['message' => 'Please choose one of the offered discount tiers.'], 422);
        }

        $participant = EventParticipant::updateOrCreate(
            ['event_id' => $event->id, 'seller_id' => Auth::id()],
            ['discount_percent' => $validated['discount_percent']]
        );

        return response()->json(['message' => "You're in! Your prices will reflect {$validated['discount_percent']}% off during {$event->title}.", 'participant' => $participant]);
    }

    /**
     * DELETE /api/events/{event}/join — seller opts back out before the event goes live.
     */
    public function leave(Event $event): JsonResponse
    {
        if ($event->isLive()) {
            return response()->json(['message' => 'You cannot leave an event that has already started.'], 422);
        }

        EventParticipant::where('event_id', $event->id)->where('seller_id', Auth::id())->delete();

        return response()->json(['message' => 'You have left the event.']);
    }
}