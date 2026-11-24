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
    /** One source of truth for the label: the stored status wins, so an ended event can never read "upcoming". */
    private function stateOf(Event $e): string
    {
        if ($e->status === 'ended' || ($e->ends_at && \Carbon\Carbon::parse($e->ends_at)->isPast())) return 'ended';
        if ($e->status === 'active') return 'live';
        return $e->status === 'scheduled' ? 'upcoming' : (string) $e->status;
    }

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

    // Past events are only listed for the sellers who took part in them (everyone else just sees live + upcoming)
    $ended = Event::where('status', 'ended')
        ->whereHas('participants', fn ($p) => $p->where('seller_id', \Illuminate\Support\Facades\Auth::id() ?? 0))
        ->orderByDesc('ends_at')
        ->limit(10)
        ->withCount('participants')
        ->get()
        ->each(fn($e) => $e->state = 'ended');

    return response()->json($active->concat($upcoming)->concat($ended)->values());
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

        $event->state = $this->stateOf($event);

        return response()->json([
            'event'         => $event->loadCount('participants'),
            'participation' => $participation,
        ]);
    }

   
    public function join(Request $request, Event $event): JsonResponse
{
    if (Auth::user()->role !== 'seller') {
        return response()->json(['message' => 'Only sellers can join events.'], 403);
    }

    if (!in_array($event->status, ['draft', 'scheduled'])) {
        return response()->json(['message' => 'This event is not open for joining.'], 422);
    }

    if ($issue = $this->sellerEligibilityIssue(Auth::user())) {
        return response()->json(['message' => $issue], 422);
    }

    $alreadyIn = EventParticipant::where('event_id', $event->id)->where('seller_id', Auth::id())->exists();

    if (!$alreadyIn && $event->max_sellers && $event->participants()->count() >= $event->max_sellers) {
        return response()->json(['message' => 'This event has reached its seller limit — check back for the next one.'], 422);
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
 * Keeps events scam-resistant: sellers need enough of a track record and
 * active inventory to participate. Returns null if eligible, or the
 * reason string to show the seller if not.
 */
private function sellerEligibilityIssue(\App\Models\User $seller): ?string
{
    if (!$seller->is_active) {
        return 'Your account must be in good standing to join events.';
    }

    $activeProducts = $seller->products()->where('status', 'active')->count();
    if ($activeProducts < 5) {
        return 'You need at least 5 active product listings to join this event.';
    }

    $reportCount = \App\Models\Report::where('reported_id', $seller->id)
        ->where('status', '!=', 'dismissed')
        ->count();

    if ($reportCount > 2) {
        return 'Your account currently has too many unresolved reports to join events.';
    }

    return null;
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
    return response()->json(Event::withCount('participants')->latest()->get()->each(fn ($e) => $e->state = $this->stateOf($e)));
}

public function adminStore(Request $request): JsonResponse
{
    $validated = $request->validate([
        'title'                        => 'required|string|max:150',
        'description'                  => 'nullable|string|max:1000',
        'theme_color'                  => 'nullable|string|max:7',
        'banner_image'                 => 'nullable|string',
        'badge_image'                  => 'nullable|string|max:500',
        'starts_at'                    => 'required|date',
        'ends_at'                      => 'required|date|after:starts_at',
        'discount_tiers'               => 'required|array|min:1',
        'discount_tiers.*'             => 'integer|min:1|max:90',
        'scavenger_hunt_target'        => 'nullable|integer|min:2',
        'scavenger_hunt_coupon_amount' => 'nullable|numeric|min:0',
        'event_fee_percent'            => 'nullable|integer|min:0|max:100',
        'max_sellers'                  => 'nullable|integer|min:5',
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
        'badge_image'                  => 'nullable|string|max:500',
        'starts_at'                    => 'sometimes|date',
        'ends_at'                      => 'sometimes|date|after:starts_at',
        'discount_tiers'               => 'sometimes|array|min:1',
        'discount_tiers.*'             => 'integer|min:1|max:90',
        'scavenger_hunt_target'        => 'nullable|integer|min:2',
        'scavenger_hunt_coupon_amount' => 'nullable|numeric|min:0',
        'event_fee_percent'            => 'nullable|integer|min:0|max:100',
        'max_sellers'                  => 'nullable|integer|min:5',
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

/** GET /badge-image/{event} — the champion badge picture of an event (admin-uploaded, else the default). */
public function badgeImage(Event $event)
{
    return redirect($event->badge_image ?: '/badges/event_champion.png', 302);
}

public function adminEnd(Event $event): JsonResponse
{
    // Ending early: pull ends_at to now, and if it never started also pull starts_at back so the dates stay sensible
    // (otherwise "starts in the future, ended already" made pages call it "upcoming").
    $event->update(['ends_at' => now(), 'starts_at' => ($event->starts_at && \Carbon\Carbon::parse($event->starts_at)->isFuture()) ? now() : $event->starts_at]);
    app(\App\Services\EventService::class)->finalize($event->fresh());   // results + champion, same as the auto-end
    return response()->json($event->fresh());
}

/** GET /api/admin/events/{event}/results — standings (live while running, frozen once ended). */
public function adminResults(Event $event): JsonResponse
{
    $rows = app(\App\Services\EventService::class)->standings($event)->map(fn ($r) => [
        'seller_id' => $r['seller_id'], 'seller' => $r['seller'], 'discount_percent' => $r['discount_percent'],
        'orders_count' => $r['orders_count'], 'revenue' => $r['revenue'], 'rank' => $r['rank'],
    ]);
    return response()->json(['event' => $event->loadCount('participants'), 'rows' => $rows]);
}

/** GET /api/events/{event}/my-results — the logged-in seller's own results for an event they joined. */
public function myResults(Event $event): JsonResponse
{
    $mine = $event->participants()->where('seller_id', Auth::id())->first();
    abort_unless($mine, 404);

    $svc = app(\App\Services\EventService::class);
    $standings = $svc->standings($event);
    $me = $standings->firstWhere('seller_id', Auth::id());

    return response()->json([
        'event' => ['id' => $event->id, 'title' => $event->title, 'starts_at' => $event->starts_at, 'ends_at' => $event->ends_at, 'status' => $event->status, 'theme_color' => $event->theme_color, 'banner_image' => $event->banner_image],
        'final' => $event->status === 'ended',
        'me' => $me ? ['orders_count' => $me['orders_count'], 'revenue' => $me['revenue'], 'rank' => $me['rank'], 'total_sellers' => $me['total_sellers'], 'discount_percent' => $me['discount_percent']] : null,
        'top' => $standings->take(5)->map(fn ($r) => [
            'rank' => $r['rank'], 'name' => $r['seller']?->name, 'username' => $r['seller']?->username,
            'orders_count' => $r['orders_count'], 'is_me' => $r['seller_id'] === Auth::id(),
        ])->values(),
        'champion' => $event->status === 'ended' && $standings->first() && $standings->first()['seller_id'] === Auth::id() && $standings->first()['revenue'] > 0,
    ]);
}

/** GET /api/events/{event}/hunt-progress — the buyer's scavenger-hunt progress. */
public function huntProgress(Event $event): JsonResponse
{
    return response()->json(['progress' => app(\App\Services\EventService::class)->huntProgress($event, Auth::id())]);
}

/** GET /api/events/hunts — progress for every live event that has a hunt (powers the floating progress pill). */
public function activeHunts(): JsonResponse
{
    $svc = app(\App\Services\EventService::class);
    $list = Event::currentlyActive()->whereNotNull('scavenger_hunt_target')->get()
        ->map(fn ($e) => $svc->huntProgress($e, Auth::id()))->filter()->values();
    return response()->json(['hunts' => $list]);
}

/** GET /api/events/my-ended — events this seller took part in that ended in the last 7 days (powers the "event ended" pop-up). */
public function myEnded(): JsonResponse
{
    $rows = \App\Models\EventParticipant::where('seller_id', Auth::id())
        ->whereNotNull('final_stats')
        ->whereHas('event', fn ($q) => $q->where('status', 'ended')->where('ends_at', '>=', now()->subDays(7)))
        ->with('event:id,title,ends_at,theme_color,banner_image')
        ->latest('id')->limit(3)->get()
        ->map(fn ($p) => ['event_id' => $p->event_id, 'title' => $p->event->title, 'ended_at' => $p->event->ends_at, 'color' => $p->event->theme_color, 'stats' => $p->final_stats]);

    return response()->json(['events' => $rows]);
}

}
