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
 * Mixes the chosen sound into the uploaded video (video stream is copied, only audio is re-encoded)
 * and replaces the stored file. If anything fails the original upload is kept, so a post is never lost.
 */
class MixSoundJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries   = 1;

    public function __construct(
        public readonly Video $video,
        public readonly int   $soundId,
        public readonly int   $start = 0,
        public readonly float $musicVolume = 0.7,
        public readonly float $originalVolume = 1.0,
        public readonly ?float $end = null,        // end of the part of the sound to use (seconds); null = until the video ends
    ) {}

    public function handle(): void
    {
        $disk  = config('filesystems.default', 'public');
        $path  = $this->video->video_url;
        $ext   = strtolower(pathinfo($path, PATHINFO_EXTENSION)) ?: 'mp4';
        $uuid  = (string) Str::uuid();
        $tmp   = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $uuid;
        $in    = $tmp . '_in.' . $ext;
        $music = $tmp . '_music.mp3';
        $out   = $tmp . '_out.' . $ext;

        try {
            $sound = Sound::active()->find($this->soundId);
            if (!$sound) { Log::warning('MixSoundJob: sound unavailable', ['sound' => $this->soundId]); return; }

            $this->download($disk, $path, $in);
            $this->download($disk, $sound->file_path, $music);

            $dur      = $this->duration($in);
            $hasAudio = $this->hasAudio($in);
            $ov       = $hasAudio ? max(0.0, min(1.0, $this->originalVolume)) : 0.0;
            $mv       = max(0.0, min(1.0, $this->musicVolume));
            $start    = ($sound->duration > 0 && $this->start >= $sound->duration) ? 0 : max(0, $this->start);
            $f        = fn (float $v) => sprintf('%.3F', $v);

            $endPart = ($this->end !== null && $this->end > $start) ? ':end=' . $f(min($this->end, $start + 150)) : '';
            $m = "[1:a]aresample=44100,atrim=start={$start}{$endPart},asetpts=PTS-STARTPTS,volume={$f($mv)},apad";
            $filter = $ov > 0.001
                ? "[0:a]aresample=44100,volume={$f($ov)},apad[a0];{$m}[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[a]"
                : "{$m}[a]";

            $codec  = $ext === 'webm' ? 'libopus' : 'aac';
            $format = $ext === 'webm' ? 'webm' : ($ext === 'mov' ? 'mov' : 'mp4');
            $ff     = str_replace('\\', '/', config('flockr.ffmpeg_path', '/var/www/bin/ffmpeg'));
            $p      = fn (string $x) => str_replace('\\', '/', $x);

            $cmd = "\"{$ff}\" -y -i \"{$p($in)}\" -i \"{$p($music)}\""
                 . " -filter_complex \"{$filter}\""
                 . ' -map 0:v:0 -map "[a]" -c:v copy -c:a ' . $codec . ' -b:a 160k'
                 . ' -t ' . $f($dur) . " -f {$format}"
                 . ($format === 'webm' ? '' : ' -movflags +faststart')
                 . " \"{$p($out)}\" 2>&1";

            exec($cmd, $lines, $code);
            if ($code !== 0 || !file_exists($out) || filesize($out) < 1000) {
                throw new \RuntimeException("FFmpeg failed ({$code}): " . implode("\n", array_slice($lines, -15)));
            }

            Storage::disk($disk)->putFileAs(dirname($path) === '.' ? '' : dirname($path), new \Illuminate\Http\File($out), basename($path), 'public');
            $this->video->update(['file_size_bytes' => filesize($out)]);
        } catch (\Throwable $e) {
            // Keep the video as uploaded (without the music) rather than losing the post
            Log::error('MixSoundJob failed', ['video' => $this->video->id, 'error' => $e->getMessage()]);
        } finally {
            foreach ([$in, $music, $out] as $f) @unlink($f);
            // Always bring the video back into the feed
            Video::whereKey($this->video->id)->where('status', 'processing')->update(['status' => 'active']);
        }
    }

    private function download(string $disk, string $path, string $dest): void
    {
        $s = Storage::disk($disk)->readStream($path);
        if (!$s) throw new \RuntimeException("Cannot read {$path}");
        $o = fopen($dest, 'wb');
        stream_copy_to_stream($s, $o);
        fclose($o); fclose($s);
    }

    private function duration(string $file): float
    {
        $fp  = str_replace('\\', '/', config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));
        $out = trim(shell_exec("\"{$fp}\" -v error -show_entries format=duration -of csv=p=0 \"" . str_replace('\\', '/', $file) . "\" 2>&1") ?? '');
        $d   = is_numeric($out) ? (float) $out : 0.0;
        return $d > 0 ? $d : 60.0;
    }

    private function hasAudio(string $file): bool
    {
        $fp  = str_replace('\\', '/', config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));
        $out = trim(shell_exec("\"{$fp}\" -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 \"" . str_replace('\\', '/', $file) . "\" 2>&1") ?? '');
        return str_contains($out, 'audio');
    }
}
