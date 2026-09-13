<?php

namespace App\Jobs;

use App\Models\Event;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ActivateScheduledEvents implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    public function handle(): void
{
    $events = Event::where('status', 'scheduled')
        ->where('starts_at', '<=', now())
        ->get();

    $service = app(\App\Services\EventService::class);

    foreach ($events as $event) {
        $event->update(['status' => 'active']);
        $service->notifyEventLive($event);
        $this->info("Activated: {$event->title}");
    }

    $this->info($events->count() . ' event(s) activated.');
}
}
