<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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

    public function indexPage(): \Inertia\Response
{
    return \Inertia\Inertia::render('Events/Index');
}

public function showPage(Event $event): \Inertia\Response
{
    $productIds = \App\Models\Product::whereIn(
        'seller_id',
        $event->participants()->pluck('seller_id')
    )->where('status', 'active')->pluck('id');

    $products = \App\Models\Product::whereIn('id', $productIds)
        ->with(['seller:id,name,username,avatar', 'category:id,name'])
        ->get();

    $userId = Auth::id();
    if ($userId) {
        $savedIds = \DB::table('product_saves')
            ->where('user_id', $userId)
            ->whereIn('product_id', $products->pluck('id')->toArray())
            ->pluck('product_id')
            ->flip()
            ->toArray();
        $products->each(fn($p) => $p->is_saved = isset($savedIds[$p->id]));
    } else {
        $products->each(fn($p) => $p->is_saved = false);
    }

    $myParticipation = Auth::check()
        ? $event->participants()->where('seller_id', Auth::id())->first()
        : null;

    return \Inertia\Inertia::render('Events/Show', [
        'event'           => $event->loadCount('participants'),
        'products'        => $products,
        'myParticipation' => $myParticipation,
    ]);
}

// ── Admin CRUD ──────────────────────────────────────────────────────────
public function adminIndex(): JsonResponse
{
    return response()->json(Event::withCount('participants')->latest()->get());
}

public function adminStore(Request $request): JsonResponse
{
    $validated = $request->validate([
        'title'                        => 'required|string|max:150',
        'description'                  => 'nullable|string|max:1000',
        'theme_color'                  => 'nullable|string|max:7',
        'banner_image'                 => 'nullable|string',
        'starts_at'                    => 'required|date',
        'ends_at'                      => 'required|date|after:starts_at',
        'discount_tiers'               => 'required|array|min:1',
        'discount_tiers.*'             => 'integer|min:1|max:90',
        'scavenger_hunt_target'        => 'nullable|integer|min:2',
        'scavenger_hunt_coupon_amount' => 'nullable|numeric|min:0',
        'event_fee_percent'            => 'nullable|integer|min:0|max:100',
    ]);

    $event = Event::create(array_merge($validated, ['status' => 'draft']));
    return response()->json($event, 201);
}

public function adminUpdate(Request $request, Event $event): JsonResponse
{
    $validated = $request->validate([
        'title'                        => 'sometimes|string|max:150',
        'description'                  => 'nullable|string|max:1000',
        'theme_color'                  => 'nullable|string|max:7',
        'banner_image'                 => 'nullable|string',
        'starts_at'                    => 'sometimes|date',
        'ends_at'                      => 'sometimes|date|after:starts_at',
        'discount_tiers'               => 'sometimes|array|min:1',
        'discount_tiers.*'             => 'integer|min:1|max:90',
        'scavenger_hunt_target'        => 'nullable|integer|min:2',
        'scavenger_hunt_coupon_amount' => 'nullable|numeric|min:0',
        'event_fee_percent'            => 'nullable|integer|min:0|max:100',
    ]);

    $event->update($validated);
    return response()->json($event);
}

public function adminPublish(Event $event): JsonResponse
{
    if ($event->status !== 'draft') {
        return response()->json(['message' => 'Only draft events can be published.'], 422);
    }

    $goingLive = $event->starts_at->isPast();
    $event->update(['status' => $goingLive ? 'active' : 'scheduled']);

    $service = app(\App\Services\EventService::class);
    $goingLive ? $service->notifyEventLive($event) : $service->notifySellersUpcoming($event);

    return response()->json($event);
}

public function adminUploadBanner(Request $request): JsonResponse
{
    $request->validate(['image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120']);
    $storage = app(\App\Services\StorageService::class);
    $key = $storage->uploadImage($request->file('image'), 'events');
    return response()->json(['url' => $storage->url($key)]);
}

public function adminEnd(Event $event): JsonResponse
{
    $event->update(['status' => 'ended', 'ends_at' => now()]);
    return response()->json($event);
}

}