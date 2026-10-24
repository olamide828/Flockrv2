<?php

namespace App\Jobs;

use App\Models\Sound;
use App\Models\Video;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Pulls the audio out of a video whose creator allowed reuse and publishes it as an
 * "original sound" other creators can pick. Never throws: a failure just means no sound is listed.
 */
class ExtractOriginalSoundJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries   = 1;

    public function __construct(public readonly Video $video) {}

    public function handle(): void
    {
        $in = $out = null;
        try {
            if (Sound::where('video_id', $this->video->id)->exists()) return;

            $disk = config('filesystems.default', 'public');
            $path = $this->video->video_url;
            $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION)) ?: 'mp4';
            $base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid();
            $in   = $base . '_in.' . $ext;
            $out  = $base . '_out.mp3';

            $s = Storage::disk($disk)->readStream($path);
            if (!$s) return;
            $o = fopen($in, 'wb'); stream_copy_to_stream($s, $o); fclose($o); fclose($s);

            $fp = str_replace('\\', '/', config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));
            $has = shell_exec("\"{$fp}\" -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 \"" . str_replace('\\', '/', $in) . "\" 2>&1");
            if (!str_contains((string) $has, 'audio')) return;           // silent video (e.g. a photo)

            $ff  = str_replace('\\', '/', config('flockr.ffmpeg_path', '/var/www/bin/ffmpeg'));
            exec("\"{$ff}\" -y -i \"" . str_replace('\\', '/', $in) . "\" -vn -t 60 -c:a libmp3lame -b:a 128k \"" . str_replace('\\', '/', $out) . "\" 2>&1", $lines, $code);
            if ($code !== 0 || !file_exists($out) || filesize($out) < 2000) return;

            $dur = trim((string) shell_exec("\"{$fp}\" -v error -show_entries format=duration -of csv=p=0 \"" . str_replace('\\', '/', $out) . "\" 2>&1"));
            $dest = 'sounds/original/' . $this->video->ulid . '.mp3';
            Storage::disk($disk)->putFileAs('sounds/original', new \Illuminate\Http\File($out), $this->video->ulid . '.mp3', 'public');

            $user = $this->video->user;
            Sound::create([
                'source'     => 'original',
                'user_id'    => $this->video->user_id,
                'video_id'   => $this->video->id,
                'title'      => 'Original sound' . ($this->video->title ? ' · ' . Str::limit($this->video->title, 50) : ''),
                'artist'     => $user?->username ? '@' . $user->username : 'Creator',
                'file_path'  => $dest,
                'duration'   => is_numeric($dur) ? (int) round((float) $dur) : 0,
                'is_active'  => true,
            ]);
        } catch (\Throwable $e) {
            Log::warning('ExtractOriginalSoundJob failed', ['video' => $this->video->id, 'error' => $e->getMessage()]);
        } finally {
            if ($in) @unlink($in);
            if ($out) @unlink($out);
        }
    }
}
