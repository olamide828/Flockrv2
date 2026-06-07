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

    public int $timeout = 600;
    public int $tries   = 1;

    private const OUTRO_DURATION = 3;

    public function __construct(
        public readonly Video  $video,
        public readonly string $cacheKey,
        public readonly string $outputPath,
    ) {}

    public function handle(): void
    {
        $uuid = Str::uuid();
        $tmp  = sys_get_temp_dir() . DIRECTORY_SEPARATOR;

        $tmpInput  = $tmp . $uuid . '_input.mp4';
        $tmpOutput = $tmp . $uuid . '_output.mp4';
        $filterFile = $tmp . $uuid . '_filter.txt';

        try {
            // 1. Resolve source video
            $this->resolveInputFile($tmpInput);

            // 2. Probe dimensions
            [$vw, $vh] = $this->probeDimensions($tmpInput);

            // 3. Check assets
            $logoPath  = $this->p(public_path('images/flockr_logo_white.png'));
            $logoOutro = $this->p(public_path('images/flockr_logo_outro.png'));
            $soundPath = $this->p(public_path('audio/flockr_outro.mp3'));

            if (!file_exists($logoPath)) {
                throw new \RuntimeException("Logo missing: {$logoPath}");
            }
            if (!file_exists($logoOutro)) $logoOutro = $logoPath;
            $hasSound = file_exists($soundPath);

            // 4. Build combined filter (watermark + outro in ONE FFmpeg pass)
            $filter = $this->buildCombinedFilter($vw, $vh, $hasSound);
            file_put_contents($filterFile, $filter);

            // 5. Run single FFmpeg pass
            $this->runFFmpeg($tmpInput, $logoPath, $logoOutro, $soundPath, $hasSound, $filterFile, $tmpOutput, $vw, $vh);

            // 6. Store result
            $disk = config('filesystems.default', 'public');
            Storage::disk($disk)->putFileAs(
                dirname($this->outputPath),
                new \Illuminate\Http\File($tmpOutput),
                basename($this->outputPath),
                'public'
            );
            $url = Storage::disk($disk)->url($this->outputPath);

            Cache::put($this->cacheKey, ['status' => 'done', 'url' => $url], now()->addMinutes(30));
            Log::info('WatermarkVideoJob done', ['ulid' => $this->video->ulid, 'url' => $url]);

        } catch (\Throwable $e) {
            Cache::put($this->cacheKey, ['status' => 'error', 'message' => $e->getMessage()], now()->addMinutes(5));
            Log::error('WatermarkVideoJob failed', ['ulid' => $this->video->ulid, 'error' => $e->getMessage()]);
            throw $e;
        } finally {
            foreach ([$tmpInput, $tmpOutput, $filterFile] as $f) {
                @unlink($f);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Single combined filter:
    // - Main video section: moving watermark (logo + text, no background pill)
    // - Outro section: 3s black card with centered logo + brand + username
    // All done in ONE FFmpeg pass = 3x faster than 3 separate passes
    //
    // Inputs:
    //   [0] = source video
    //   [1] = watermark logo (white, small)
    //   [2] = outro logo (teal, large) — or same as [1] if not present
    //   [3] = outro sound (optional) — only if $hasSound
    // ─────────────────────────────────────────────────────────────────────────
    private function buildCombinedFilter(int $vw, int $vh, bool $hasSound): string
    {
        $username  = '@' . preg_replace('/[^a-zA-Z0-9@_\-.]/', '', $this->video->user?->username ?? 'flockr');
        $fontArg   = $this->buildFontArg();
        $duration  = self::OUTRO_DURATION;

        // ── Watermark sizing ──────────────────────────────────────────────────
        $logoW  = max(22, (int) round($vw * 0.055));
        $logoH  = $logoW;
        $pad    = max(14, (int) round($vw * 0.04));
        $fSize  = max(13, (int) round($vw * 0.036));
        $uSize  = max(11, (int) round($vw * 0.028));
        $gap    = 5;
        $shadow = ":shadowcolor=black@0.6:shadowx=1:shadowy=1";

        // Four corner positions (pre-calculated, no text_w references)
        $corners = [
            'TL' => [
                'lx' => $pad,
                'ly' => $pad,
                'tx' => $pad + $logoW + $gap,
                'ty' => $pad,
                'ty2' => $pad + $fSize + 3,
                'en' => "lt(mod(t,20),5)",
            ],
            'TR' => [
                'lx' => $vw - $logoW - $pad - 130,
                'ly' => $pad,
                'tx' => $vw - $pad - 130,
                'ty' => $pad,
                'ty2' => $pad + $fSize + 3,
                'en' => "between(mod(t,20),5,10)",
            ],
            'BR' => [
                'lx' => $vw - $logoW - $pad - 130,
                'ly' => $vh - $logoH - $pad - $fSize - $uSize - 6,
                'tx' => $vw - $pad - 130,
                'ty' => $vh - $logoH - $pad - $fSize - $uSize - 6,
                'ty2' => $vh - $logoH - $pad - $uSize - 3,
                'en' => "between(mod(t,20),10,15)",
            ],
            'BL' => [
                'lx' => $pad,
                'ly' => $vh - $logoH - $pad - $fSize - $uSize - 6,
                'tx' => $pad + $logoW + $gap,
                'ty' => $vh - $logoH - $pad - $fSize - $uSize - 6,
                'ty2' => $vh - $logoH - $pad - $uSize - 3,
                'en' => "gte(mod(t,20),15)",
            ],
        ];

        // ── Outro sizing ──────────────────────────────────────────────────────
        $outroLogoSize = max(80, (int) round(min($vw, $vh) * 0.18));
        $outroLogoX    = (int) (($vw - $outroLogoSize) / 2);
        $centerY       = (int) ($vh / 2);
        $outroLogoY    = $centerY - $outroLogoSize - 8;
        $brandSize     = max(28, (int) round($vw * 0.075));
        $userSize      = max(18, (int) round($vw * 0.042));
        $brandY        = $centerY + 12;
        $userY         = $brandY + $brandSize + 14;

        $lines = [];

        // ── Scale both logos ──────────────────────────────────────────────────
        // [1] = watermark logo → split into 4 for the 4 corners
        $lines[] = "[1:v]scale={$logoW}:{$logoH},split=4[wml0][wml1][wml2][wml3]";
        // [2] = outro logo → scaled
        $lines[] = "[2:v]scale={$outroLogoSize}:{$outroLogoSize}[outrologo]";

        // ── Main video: apply watermark ───────────────────────────────────────
        $prev = '0:v';
        $i    = 0;
        foreach ($corners as $name => $c) {
            $logoIn = "wml{$i}";
            $alo    = "alo_{$name}";
            $aft    = "aft_{$name}";
            $unOut  = ($i < 3) ? "wm_{$name}" : "main_wm";

            $lines[] = "[{$prev}][{$logoIn}]overlay=x={$c['lx']}:y={$c['ly']}:enable='{$c['en']}'[{$alo}]";
            $lines[] = "[{$alo}]drawtext=text='flockr'{$fontArg}:fontsize={$fSize}:fontcolor=white{$shadow}:x={$c['tx']}:y={$c['ty']}:enable='{$c['en']}'[{$aft}]";
            $lines[] = "[{$aft}]drawtext=text='{$username}'{$fontArg}:fontsize={$uSize}:fontcolor=white@0.85{$shadow}:x={$c['tx']}:y={$c['ty2']}:enable='{$c['en']}'[{$unOut}]";

            $prev = "wm_{$name}";
            $i++;
        }

        // ── Outro: black card generated from lavfi (input [3] in FFmpeg cmd) ──
        // [3] in the filter = the lavfi color source (added as -f lavfi input)
        $lines[] = "[3:v][outrologo]overlay=x={$outroLogoX}:y={$outroLogoY}[outro_logo]";
        $lines[] = "[outro_logo]drawtext=text='flockr'{$fontArg}:fontsize={$brandSize}:fontcolor=white:x=(w-text_w)/2:y={$brandY}[outro_brand]";
        $lines[] = "[outro_brand]drawtext=text='{$username}'{$fontArg}:fontsize={$userSize}:fontcolor=0xFF6B35:x=(w-text_w)/2:y={$userY}[outro_out]";

        // ── Concat main + outro ───────────────────────────────────────────────
        // Audio: use [0:a] for main, [4:a] for outro sound (or silence)
        $lines[] = "[main_wm][0:a][outro_out][4:a]concat=n=2:v=1:a=1[outv][outa]";

        return implode(";\n", $lines);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Single FFmpeg invocation with all inputs
    // Inputs:
    //   0 = source video
    //   1 = watermark logo
    //   2 = outro logo
    //   3 = lavfi black bg for outro
    //   4 = outro audio (sound file or silence)
    // ─────────────────────────────────────────────────────────────────────────
    private function runFFmpeg(
        string $input, string $wmLogo, string $outroLogo,
        string $sound, bool $hasSound,
        string $filterFile, string $output,
        int $vw, int $vh
    ): void {
        $ff       = $this->ff();
        $duration = self::OUTRO_DURATION;

        $audioInput = $hasSound
            ? " -i \"" . $this->p($sound) . "\""
            : " -f lavfi -i anullsrc=r=44100:cl=stereo";

        $cmd = "\"{$ff}\" -y"
             // Input 0: source video
             . " -i \"" . $this->p($input) . "\""
             // Input 1: watermark logo
             . " -i \"" . $this->p($wmLogo) . "\""
             // Input 2: outro logo
             . " -i \"" . $this->p($outroLogo) . "\""
             // Input 3: lavfi black background for outro
             . " -f lavfi -i color=c=0x111111:s={$vw}x{$vh}:r=30:d={$duration}"
             // Input 4: outro audio
             . $audioInput
             // Filter
             . " -/filter_complex \"" . $this->p($filterFile) . "\""
             . " -map \"[outv]\" -map \"[outa]\""
             . " -c:v libx264 -pix_fmt yuv420p -r 30 -preset fast -crf 28"
             . " -c:a aac -ar 44100 -ac 2"
             . " -movflags +faststart"
             . " \"" . $this->p($output) . "\" 2>&1";

        Log::debug('WatermarkVideoJob command', ['cmd' => $cmd]);
        exec($cmd, $lines, $code);

        if ($code !== 0) {
            // Fallback: try without audio concat (video had no audio stream)
            Log::warning('WatermarkVideoJob: audio concat failed, trying video-only fallback');

            // Rebuild filter without audio concat
            $filterNoAudio = $this->buildCombinedFilterNoAudio($vw, $vh);
            $filterFileNA  = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '_fna.txt';
            file_put_contents($filterFileNA, $filterNoAudio);

            $cmd2 = "\"{$ff}\" -y"
                  . " -i \"" . $this->p($input) . "\""
                  . " -i \"" . $this->p($wmLogo) . "\""
                  . " -i \"" . $this->p($outroLogo) . "\""
                  . " -f lavfi -i color=c=0x111111:s={$vw}x{$vh}:r=30:d={$duration}"
                  . " -/filter_complex \"" . $this->p($filterFileNA) . "\""
                  . " -map \"[outv]\" -an"
                  . " -c:v libx264 -pix_fmt yuv420p -r 30 -preset fast -crf 28"
                  . " -movflags +faststart"
                  . " \"" . $this->p($output) . "\" 2>&1";

            exec($cmd2, $lines2, $code2);
            @unlink($filterFileNA);

            if ($code2 !== 0) {
                $tail = implode("\n", array_slice($lines, -20));
                throw new \RuntimeException("FFmpeg failed (code {$code}):\n{$tail}");
            }
        }
    }

    // Fallback filter without audio (for videos with no audio stream)
    private function buildCombinedFilterNoAudio(int $vw, int $vh): string
    {
        $username  = '@' . preg_replace('/[^a-zA-Z0-9@_\-.]/', '', $this->video->user?->username ?? 'flockr');
        $fontArg   = $this->buildFontArg();
        $duration  = self::OUTRO_DURATION;

        $logoW  = max(22, (int) round($vw * 0.055));
        $logoH  = $logoW;
        $pad    = max(14, (int) round($vw * 0.04));
        $fSize  = max(13, (int) round($vw * 0.036));
        $uSize  = max(11, (int) round($vw * 0.028));
        $gap    = 5;
        $shadow = ":shadowcolor=black@0.6:shadowx=1:shadowy=1";

        $corners = [
            'TL' => ['lx' => $pad, 'ly' => $pad, 'tx' => $pad + $logoW + $gap, 'ty' => $pad, 'ty2' => $pad + $fSize + 3, 'en' => "lt(mod(t,20),5)"],
            'TR' => ['lx' => $vw - $logoW - $pad - 130, 'ly' => $pad, 'tx' => $vw - $pad - 130, 'ty' => $pad, 'ty2' => $pad + $fSize + 3, 'en' => "between(mod(t,20),5,10)"],
            'BR' => ['lx' => $vw - $logoW - $pad - 130, 'ly' => $vh - $logoH - $pad - $fSize - $uSize - 6, 'tx' => $vw - $pad - 130, 'ty' => $vh - $logoH - $pad - $fSize - $uSize - 6, 'ty2' => $vh - $logoH - $pad - $uSize - 3, 'en' => "between(mod(t,20),10,15)"],
            'BL' => ['lx' => $pad, 'ly' => $vh - $logoH - $pad - $fSize - $uSize - 6, 'tx' => $pad + $logoW + $gap, 'ty' => $vh - $logoH - $pad - $fSize - $uSize - 6, 'ty2' => $vh - $logoH - $pad - $uSize - 3, 'en' => "gte(mod(t,20),15)"],
        ];

        $outroLogoSize = max(80, (int) round(min($vw, $vh) * 0.18));
        $outroLogoX    = (int) (($vw - $outroLogoSize) / 2);
        $centerY       = (int) ($vh / 2);
        $outroLogoY    = $centerY - $outroLogoSize - 8;
        $brandSize     = max(28, (int) round($vw * 0.075));
        $userSize      = max(18, (int) round($vw * 0.042));
        $brandY        = $centerY + 12;
        $userY         = $brandY + $brandSize + 14;

        $lines   = [];
        $lines[] = "[1:v]scale={$logoW}:{$logoH},split=4[wml0][wml1][wml2][wml3]";
        $lines[] = "[2:v]scale={$outroLogoSize}:{$outroLogoSize}[outrologo]";

        $prev = '0:v'; $i = 0;
        foreach ($corners as $name => $c) {
            $unOut = ($i < 3) ? "wm_{$name}" : "main_wm";
            $lines[] = "[{$prev}][wml{$i}]overlay=x={$c['lx']}:y={$c['ly']}:enable='{$c['en']}'[alo_{$name}]";
            $lines[] = "[alo_{$name}]drawtext=text='flockr'{$fontArg}:fontsize={$fSize}:fontcolor=white{$shadow}:x={$c['tx']}:y={$c['ty']}:enable='{$c['en']}'[aft_{$name}]";
            $lines[] = "[aft_{$name}]drawtext=text='{$username}'{$fontArg}:fontsize={$uSize}:fontcolor=white@0.85{$shadow}:x={$c['tx']}:y={$c['ty2']}:enable='{$c['en']}'[{$unOut}]";
            $prev = "wm_{$name}"; $i++;
        }

        $lines[] = "[3:v][outrologo]overlay=x={$outroLogoX}:y={$outroLogoY}[outro_logo]";
        $lines[] = "[outro_logo]drawtext=text='flockr'{$fontArg}:fontsize={$brandSize}:fontcolor=white:x=(w-text_w)/2:y={$brandY}[outro_brand]";
        $lines[] = "[outro_brand]drawtext=text='{$username}'{$fontArg}:fontsize={$userSize}:fontcolor=0xFF6B35:x=(w-text_w)/2:y={$userY}[outro_out]";
        $lines[] = "[main_wm][outro_out]concat=n=2:v=1:a=0[outv]";

        return implode(";\n", $lines);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function resolveInputFile(string $dest): void
    {
        $url  = $this->video->video_url;
        $disk = config('filesystems.default', 'public');

        if (in_array($disk, ['local', 'public'])) {
            $local = Storage::disk($disk)->path($url);
            if (file_exists($local)) { copy($local, $dest); return; }
        }

        if (Storage::disk($disk)->exists($url)) {
            $stream = Storage::disk($disk)->readStream($url);
            if (!$stream) throw new \RuntimeException("Cannot stream: {$url}");
            $out = fopen($dest, 'wb');
            stream_copy_to_stream($stream, $out);
            fclose($out); fclose($stream);
            return;
        }

        if (str_starts_with($url, 'http')) {
            $ctx  = stream_context_create(['http' => ['timeout' => 120], 'ssl' => ['verify_peer' => false]]);
            $data = file_get_contents($url, false, $ctx);
            if ($data === false) throw new \RuntimeException("HTTP download failed: {$url}");
            file_put_contents($dest, $data);
            return;
        }

        throw new \RuntimeException("Cannot resolve video: {$url}");
    }

    private function probeDimensions(string $path): array
    {
        $fp  = str_replace('\\', '/', config('flockr.ffprobe_path', 'ffprobe'));
        $out = trim(shell_exec("\"{$fp}\" -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 \"" . $this->p($path) . "\" 2>&1") ?? '');
        if (preg_match('/(\d+),(\d+)/', $out, $m)) return [(int) $m[1], (int) $m[2]];
        return [720, 1280];
    }

    private function buildFontArg(): string
    {
        $font = $this->findFont();
        if (!$font) return '';
        $f = preg_replace('/^([A-Za-z]):/', '$1\\:', $this->p($font));
        return ":fontfile='{$f}'";
    }

    private function p(string $path): string
    {
        return str_replace('\\', '/', $path);
    }

    private function ff(): string
    {
        return $this->p(config('flockr.ffmpeg_path', 'ffmpeg'));
    }

    private function findFont(): ?string
    {
        foreach ([
            'C:/Windows/Fonts/arialbd.ttf',
            'C:/Windows/Fonts/arial.ttf',
            'C:/Windows/Fonts/calibrib.ttf',
            public_path('fonts/Inter-Bold.ttf'),
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        ] as $f) {
            if (file_exists($this->p($f))) return $f;
        }
        return null;
    }
}