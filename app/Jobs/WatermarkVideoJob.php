<?php

namespace App\Jobs;

use App\Models\Video;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class WatermarkVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries   = 1; // don't retry — surface the real error instead

    public function __construct(
        public readonly Video  $video,
        public readonly string $cacheKey,
        public readonly string $outputPath,
    ) {}

    public function handle(): void
    {
        $tmpInput  = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '.mp4';
        $tmpOutput = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '_wm.mp4';

        try {
            // ── 1. Get the source video as a local temp file ──────────────────
            $this->resolveInputFile($tmpInput);

            // ── 2. Probe dimensions ───────────────────────────────────────────
            [$vw, $vh] = $this->probeDimensions($tmpInput);

            // ── 3. Locate logo ────────────────────────────────────────────────
            $logoPath = public_path('images' . DIRECTORY_SEPARATOR . 'flockr_logo_white.png');
            if (!file_exists($logoPath)) {
                throw new \RuntimeException("Logo not found at: {$logoPath}");
            }

            // ── 4. Build watermark filter ──────────────────────────────────────
            $filter = $this->buildFilter($vw, $vh);

            // ── 5. Run FFmpeg ──────────────────────────────────────────────────
            $ffmpeg = $this->ffmpegPath();
            $this->runFFmpeg($ffmpeg, $tmpInput, $logoPath, $filter, $tmpOutput);

            // ── 6. Store result ────────────────────────────────────────────────
            $disk = config('filesystems.default', 'public');
            Storage::disk($disk)->put(
                $this->outputPath,
                file_get_contents($tmpOutput),
                'public'
            );
            $downloadUrl = Storage::disk($disk)->url($this->outputPath);

            Cache::put($this->cacheKey, [
                'status' => 'done',
                'url'    => $downloadUrl,
            ], now()->addMinutes(30));

            Log::info('WatermarkVideoJob done', [
                'ulid' => $this->video->ulid,
                'url'  => $downloadUrl,
            ]);

        } catch (\Throwable $e) {
            Cache::put($this->cacheKey, [
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], now()->addMinutes(5));

            Log::error('WatermarkVideoJob failed', [
                'ulid'  => $this->video->ulid,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e; // re-throw so queue marks it as failed
        } finally {
            @unlink($tmpInput);
            @unlink($tmpOutput);
        }
    }

    // ── Resolve source video to a local temp file ─────────────────────────────
    private function resolveInputFile(string $dest): void
    {
        $videoUrl = $this->video->video_url;

        // If it's already an absolute path on disk, just copy it
        if (file_exists($videoUrl)) {
            copy($videoUrl, $dest);
            return;
        }

        // Try to resolve via Storage disk (works for both local and R2)
        $disk = config('filesystems.default', 'public');

        // For local/public disk — read directly from filesystem, no HTTP needed
        if (in_array($disk, ['local', 'public'])) {
            $localPath = Storage::disk($disk)->path($videoUrl);
            if (file_exists($localPath)) {
                copy($localPath, $dest);
                return;
            }
        }

        // For R2/S3 — stream via Storage facade (avoids CORS/HTTP issues)
        if (Storage::disk($disk)->exists($videoUrl)) {
            $stream = Storage::disk($disk)->readStream($videoUrl);
            if (!$stream) throw new \RuntimeException("Cannot open stream for: {$videoUrl}");
            $out = fopen($dest, 'wb');
            stream_copy_to_stream($stream, $out);
            fclose($out);
            fclose($stream);
            return;
        }

        // Last resort: HTTP download (for absolute URLs)
        if (str_starts_with($videoUrl, 'http')) {
            $ctx = stream_context_create([
                'http' => ['timeout' => 120, 'follow_location' => true],
                'ssl'  => ['verify_peer' => false], // needed on Windows dev
            ]);
            $data = file_get_contents($videoUrl, false, $ctx);
            if ($data === false) throw new \RuntimeException("HTTP download failed: {$videoUrl}");
            file_put_contents($dest, $data);
            return;
        }

        throw new \RuntimeException("Cannot resolve video source: {$videoUrl}");
    }

    // ── Probe video width × height ────────────────────────────────────────────
    private function probeDimensions(string $path): array
    {
        $ffprobe = $this->ffprobePath();
        // Use forward slashes on Windows — PHP handles them fine
        $safePath = str_replace('\\', '/', $path);

        $cmd = "\"{$ffprobe}\" -v error -select_streams v:0"
             . " -show_entries stream=width,height -of csv=p=0"
             . " \"{$safePath}\"";

        $out = trim(shell_exec($cmd . ' 2>&1') ?? '');

        Log::debug('FFprobe output', ['cmd' => $cmd, 'out' => $out]);

        if (preg_match('/(\d+),(\d+)/', $out, $m)) {
            return [(int) $m[1], (int) $m[2]];
        }

        // Fall back to safe 9:16 default
        return [720, 1280];
    }

    // ── Build FFmpeg filter_complex string ────────────────────────────────────
    private function buildFilter(int $vw, int $vh): string
    {
        $username = '@' . preg_replace('/[^a-zA-Z0-9@_\-.]/', '', $this->video->user?->username ?? 'flockr');
        $font     = $this->findFont();
        $fontArg  = $font ? (':fontfile=' . str_replace('\\', '/', $font)) : '';

        $logoW  = max(40, (int) round($vw * 0.10));
        $logoH  = $logoW;
        $pad    = max(12, (int) round($vw * 0.04));
        $fSize  = max(18, (int) round($vw * 0.042));
        $uSize  = max(14, (int) round($vw * 0.032));
        $pillH  = $logoH + max(16, (int) round($vh * 0.04));
        $pillW  = $logoW + max(120, (int) round($vw * 0.32));

        $tlX = $pad;
        $tlY = $pad;
        $brX = $vw - $pillW - $pad;
        $brY = $vh - $pillH - $pad;

        $logoOffY = (int) (($pillH - $logoH) / 2);
        $txtX_tl  = $tlX + $logoW + 8;
        $txtX_br  = $brX + $logoW + 8;
        $titleY_tl = $tlY + (int) (($pillH / 2) - $fSize / 2) - 4;
        $userY_tl  = $tlY + (int) (($pillH / 2) + 4);
        $titleY_br = $brY + (int) (($pillH / 2) - $fSize / 2) - 4;
        $userY_br  = $brY + (int) (($pillH / 2) + 4);

        // mod(t,10): 0–5s = top-left, 5–10s = bottom-right
        $enTL = "lte(mod(t\\,10)\\,5)";
        $enBR = "gt(mod(t\\,10)\\,5)";

        return implode(';', [
            "[1:v]scale={$logoW}:{$logoH}[logo]",

            // Top-left
            "[0:v]drawbox=x={$tlX}:y={$tlY}:w={$pillW}:h={$pillH}:color=black@0.55:t=fill:enable='{$enTL}'[bg_tl]",
            "[bg_tl][logo]overlay=x={$tlX}:y=" . ($tlY + $logoOffY) . ":enable='{$enTL}'[lo_tl]",
            "[lo_tl]drawtext=text='flockr'{$fontArg}:fontsize={$fSize}:fontcolor=white:x={$txtX_tl}:y={$titleY_tl}:enable='{$enTL}'[ft_tl]",
            "[ft_tl]drawtext=text='{$username}'{$fontArg}:fontsize={$uSize}:fontcolor=white@0.75:x={$txtX_tl}:y={$userY_tl}:enable='{$enTL}'[tl]",

            // Bottom-right
            "[tl]drawbox=x={$brX}:y={$brY}:w={$pillW}:h={$pillH}:color=black@0.55:t=fill:enable='{$enBR}'[bg_br]",
            "[bg_br][logo]overlay=x={$brX}:y=" . ($brY + $logoOffY) . ":enable='{$enBR}'[lo_br]",
            "[lo_br]drawtext=text='flockr'{$fontArg}:fontsize={$fSize}:fontcolor=white:x={$txtX_br}:y={$titleY_br}:enable='{$enBR}'[ft_br]",
            "[ft_br]drawtext=text='{$username}'{$fontArg}:fontsize={$uSize}:fontcolor=white@0.75:x={$txtX_br}:y={$userY_br}:enable='{$enBR}'[out]",
        ]);
    }

    // ── Run FFmpeg with Windows-safe quoting ──────────────────────────────────
    private function runFFmpeg(
        string $ffmpeg,
        string $input,
        string $logo,
        string $filter,
        string $output
    ): void {
        // Forward slashes work on Windows in most contexts
        $ffmpeg = str_replace('\\', '/', $ffmpeg);
        $input  = str_replace('\\', '/', $input);
        $logo   = str_replace('\\', '/', $logo);
        $output = str_replace('\\', '/', $output);

        // Build args array and quote each one with double quotes (Windows-safe)
        $args = [
            $ffmpeg,
            '-y',
            '-i', $input,
            '-i', $logo,
            '-filter_complex', $filter,
            '-map', '[out]',
            '-map', '0:a?',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac',
            '-movflags', '+faststart',
            $output,
        ];

        // Quote every arg with double quotes, escape inner double quotes
        $quoted = array_map(fn($a) => '"' . str_replace('"', '\"', $a) . '"', $args);
        $cmd    = implode(' ', $quoted);

        Log::debug('WatermarkVideoJob FFmpeg command', ['cmd' => $cmd]);

        exec($cmd . ' 2>&1', $outputLines, $code);

        if ($code !== 0) {
            $tail = implode("\n", array_slice($outputLines, -15));
            throw new \RuntimeException("FFmpeg exited with code {$code}:\n{$tail}");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function ffmpegPath(): string
    {
        $path = config('flockr.ffmpeg_path', 'ffmpeg');
        // Resolve relative name to full path on Windows if needed
        if (!str_contains($path, '/') && !str_contains($path, '\\')) {
            // Try to find it via where/which
            $found = trim(shell_exec(PHP_OS_FAMILY === 'Windows' ? "where {$path} 2>nul" : "which {$path} 2>/dev/null") ?? '');
            if ($found) return explode("\n", $found)[0];
        }
        return $path;
    }

    private function ffprobePath(): string
    {
        $path = config('flockr.ffprobe_path', 'ffprobe');
        if (!str_contains($path, '/') && !str_contains($path, '\\')) {
            $found = trim(shell_exec(PHP_OS_FAMILY === 'Windows' ? "where {$path} 2>nul" : "which {$path} 2>/dev/null") ?? '');
            if ($found) return explode("\n", $found)[0];
        }
        return $path;
    }

    private function findFont(): ?string
    {
        $candidates = [
            // Windows fonts (most likely on your dev machine)
            'C:/Windows/Fonts/arialbd.ttf',
            'C:/Windows/Fonts/arial.ttf',
            'C:/Windows/Fonts/calibrib.ttf',
            'C:/Windows/Fonts/segoeui.ttf',
            // Project bundled font (best option — drop any .ttf into public/fonts/)
            public_path('fonts/Inter-Bold.ttf'),
            public_path('fonts/Roboto-Bold.ttf'),
            // Linux (production)
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        ];
        foreach ($candidates as $f) {
            $f = str_replace('\\', '/', $f);
            if (file_exists($f)) return $f;
        }
        return null;
    }
}