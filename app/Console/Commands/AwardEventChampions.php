<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Services\EventService;
use Illuminate\Console\Command;

class AwardEventChampions extends Command
{
    protected $signature = 'events:award-champions';
    protected $description = 'Auto-end events whose time is up: freeze seller results, notify sellers and crown the champion';

    public function handle(EventService $service): void
    {
        $ended = Event::whereIn('status', ['active', 'scheduled'])->where('ends_at', '<=', now())->get();   // 'scheduled' too: an event nobody activated in time still has to close
        foreach ($ended as $event) {
            try { $service->finalize($event); }
            catch (\Throwable $e) { report($e); $this->error("Event #{$event->id} failed: {$e->getMessage()}"); continue; }
            $this->info("Finalised event #{$event->id} {$event->title}");
        }
        $this->info('Done. ' . $ended->count() . ' event(s) processed.');
    }
}
