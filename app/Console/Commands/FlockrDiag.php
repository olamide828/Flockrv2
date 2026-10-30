<?php

namespace App\Console\Commands;

use App\Jobs\WatermarkVideoJob;
use App\Models\Video;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * php artisan flockr:diag                 -> prints what matters for uploads / downloads (paste the output to support)
 * php artisan flockr:diag --download=12   -> also runs the download (watermark) job for video 12 right now, in the
 *                                            foreground, and prints the real error if it fails
 */
class FlockrDiag extends Command
{
    protected $signature = 'flockr:diag {--download= : Video id to run the watermark/download job for}';
    protected $description = 'Check the settings that cause upload 503s and failing downloads';

    public function handle(): int
    {
        $this->line('PHP ' . PHP_VERSION . ' | memory_limit ' . ini_get('memory_limit') . ' | max_execution_time ' . ini_get('max_execution_time'));
        $this->line('upload_max_filesize ' . ini_get('upload_max_filesize') . ' | post_max_size ' . ini_get('post_max_size'));
        $this->line('queue: ' . config('queue.default') . ' | retry_after ' . config('queue.connections.' . config('queue.default') . '.retry_after'));
        $this->line('cache: ' . config('cache.default') . ' | filesystem: ' . config('filesystems.default'));

        if (config('cache.default') === 'file') {
            $this->warn('Cache is "file": the web server and the queue worker do NOT share it on Laravel Cloud, so the download page can never see "done". Use database or redis.');
        }

        $ff = trim((string) @shell_exec('which ffmpeg 2>/dev/null')) ?: '(not found)';
        $this->line("ffmpeg: {$ff}");
        if ($ff !== '(not found)') {
            $this->line(trim((string) @shell_exec('ffmpeg -version 2>&1 | head -1')));
            $this->line('drawtext: ' . (str_contains((string) @shell_exec('ffmpeg -hide_banner -filters 2>&1'), 'drawtext') ? 'yes' : 'NO'));
        }

        try {
            $this->line('jobs waiting: ' . DB::table('jobs')->count() . ' | failed: ' . DB::table('failed_jobs')->count());
            $last = DB::table('failed_jobs')->orderByDesc('id')->limit(3)->get(['queue', 'failed_at', 'exception']);
            foreach ($last as $f) {
                $this->line('  failed ' . $f->failed_at . ' [' . $f->queue . '] ' . Str::limit(strtok($f->exception, "\n"), 300));
            }
        } catch (\Throwable $e) {
            $this->line('queue tables: ' . $e->getMessage());
        }

        try {
            $url = Storage::disk()->temporaryUploadUrl('videos/diag-' . Str::random(6) . '.mp4', now()->addMinutes(5));
            $this->info('direct upload: supported (' . parse_url($url['url'], PHP_URL_HOST) . ')');
        } catch (\Throwable $e) {
            $this->warn('direct upload: not available (' . $e->getMessage() . ') - uploads go through PHP');
        }

        if ($id = $this->option('download')) {
            $video = Video::find($id);
            if (! $video) { $this->error("Video {$id} not found"); return self::FAILURE; }
            $key = 'wm_diag_' . Str::random(6);
            $out = 'downloads/diag-' . $video->id . '.mp4';
            $this->line("Running the download job for video {$id}...");
            try {
                (new WatermarkVideoJob($video, $key, $out))->handle();
            } catch (\Throwable $e) {
                $this->error(get_class($e) . ': ' . $e->getMessage());
                return self::FAILURE;
            }
            $this->info('Result: ' . json_encode(Cache::get($key)));
        }

        return self::SUCCESS;
    }
}
