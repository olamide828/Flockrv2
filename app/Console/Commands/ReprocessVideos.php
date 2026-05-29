<?php

namespace App\Console\Commands;

use App\Jobs\ProcessVideoJob;
use App\Models\Video;
use Illuminate\Console\Command;

class ReprocessVideos extends Command
{
    protected $signature   = 'videos:reprocess {--status=active : Only reprocess videos with this status}';
    protected $description = 'Re-dispatch ProcessVideoJob for existing videos to generate thumbnails';

    public function handle(): void
    {
        $videos = Video::whereNull('thumbnail_url')
            ->where('status', 'active')
            ->get();

        if ($videos->isEmpty()) {
            $this->info('No videos need reprocessing.');
            return;
        }

        $this->info("Reprocessing {$videos->count()} video(s)...");

        foreach ($videos as $video) {
            ProcessVideoJob::dispatch($video);
            $this->line("  → Dispatched job for video #{$video->id}: {$video->title}");
        }

        $this->info('Done! Run `php artisan queue:work` to process the jobs.');
    }
}