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
        $ended = Event::where('status', 'active')->where('ends_at', '<=', now())->get();
        foreach ($ended as $event) {
            $service->finalize($event);
            $this->info("Finalised event #{$event->id} {$event->title}");
        }
        $this->info('Done. ' . $ended->count() . ' event(s) processed.');
    }
}
