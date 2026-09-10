<?php

namespace App\Console\Commands;

use App\Models\Event;
use Illuminate\Console\Command;

class ActivateScheduledEvents extends Command
{
    protected $signature = 'events:activate-scheduled';
    protected $description = 'Flip scheduled events to active once their starts_at time arrives';

    public function handle(): void
    {
        $events = Event::where('status', 'scheduled')
            ->where('starts_at', '<=', now())
            ->get();

        foreach ($events as $event) {
            $event->update(['status' => 'active']);
            $this->info("Activated: {$event->title}");
        }

        $this->info($events->count() . ' event(s) activated.');
    }
}