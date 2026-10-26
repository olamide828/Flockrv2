<?php

namespace App\Console\Commands;

use App\Models\Video;
use Illuminate\Console\Command;

/**
 * Publishes videos that got stuck on "pending"/"processing" (a job was killed or ran out of attempts).
 * The original upload is stored, so the video simply plays without the extras (watermark / HLS).
 *
 *   php artisan videos:heal              # videos stuck for more than 30 minutes
 *   php artisan videos:heal --minutes=0  # everything stuck right now
 *
 * Schedule it in routes/console.php:  Schedule::command('videos:heal')->everyTenMinutes();
 */
class HealStuckVideos extends Command
{
    protected $signature = 'videos:heal {--minutes=30}';
    protected $description = 'Publish videos stuck in processing';

    public function handle(): int
    {
        $cutoff = now()->subMinutes((int) $this->option('minutes'));

        $q = Video::whereIn('status', ['pending', 'processing'])
            ->whereNotNull('video_url')
            ->where('updated_at', '<=', $cutoff);

        $ids = (clone $q)->pluck('id');
        $n = $q->update(['status' => 'active']);
        Video::whereIn('id', $ids)->whereNull('published_at')->update(['published_at' => now()]);

        $this->info("Published {$n} stuck video(s).");
        return self::SUCCESS;
    }
}
