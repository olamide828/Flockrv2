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

    /** Folder of the font used by drawtext; set by buildFontArg(), used as FFmpeg's cwd. */
    private ?string $fontDir = null;

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

            // 2. Probe dimensions, duration and whether there is an audio track
            [$vw, $vh] = $this->probeDimensions($tmpInput);
            $dur       = $this->probeDuration($tmpInput);
            $hasAudio  = $this->probeHasAudio($tmpInput);

            // 3. Check assets
            $logoPath  = $this->p(public_path('images/flockr_logo_white.png'));
            $logoOutro = $this->p(public_path('images/flockr_logo_orange.png'));
            $soundPath = $this->p(public_path('audio/flockr_outro.mp3'));

            if (!file_exists($logoPath)) {
                throw new \RuntimeException("Logo missing: {$logoPath}");
            }
            if (!file_exists($logoOutro)) $logoOutro = $logoPath;
            $hasSound = file_exists($soundPath);

            // 4. Build combined filter (watermark + outro in ONE FFmpeg pass)
            $filter = $this->buildFilter($vw, $vh, $dur, $hasAudio);
            file_put_contents($filterFile, $filter);

            // 5. Run single FFmpeg pass
            $this->runFFmpeg($tmpInput, $logoPath, $logoOutro, $soundPath, $hasSound, $filterFile, $tmpOutput, $dur);

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
    // Watermark + outro in ONE FFmpeg pass.
    //
    // Watermark: a small logo + @username lockup that fades in and out at the
    //   top-right, then at the bottom-left, alternating through the video.
    // Outro: the video's own last frame is held for OUTRO_DURATION seconds and
    //   dimmed (not blacked out), so the footage stays visible underneath while
    //   the logo, brand and @username ease in on top.
    //
    // Inputs: 0 = video, 1 = watermark logo, 2 = outro logo, 3 = outro sound
    // ─────────────────────────────────────────────────────────────────────────
    private function buildFilter(int $vw, int $vh, float $dur, bool $hasAudio): string
    {
        $user = '@' . preg_replace('/[^a-zA-Z0-9_\-.]/', '', $this->video->user?->username ?? 'flockr');
        $font = $this->buildFontArg();
        $D    = $this->fmt($dur);
        $out  = self::OUTRO_DURATION;
        $fmt  = fn (float $v): string => $this->fmt($v);

        // Tunables
        $maxOpacity = 0.92;   // peak watermark opacity
        $dim        = 0.42;   // outro darkness (0 = none, 1 = black)

        // ── Watermark metrics ─────────────────────────────────────────────────
        $lw   = max(24, (int) round($vw * 0.07));    // logo size
        $gap  = max(6,  (int) round($vw * 0.014));
        $us   = max(14, (int) round($vw * 0.036));   // @username size
        $bs   = max(11, (int) round($vw * 0.026));   // "flockr" size
        $padX = max(16, (int) round($vw * 0.045));
        $padT = max(20, (int) round($vh * 0.045));
        $padB = max(24, (int) round($vh * 0.06));
        $textDy = max(0, (int) round(($lw - ($us + 3 + $bs)) / 2));

        // ── Fade timing: top-right in the first half of each cycle, bottom-left in the second
        $period = max(6.0, min(14.0, $dur));
        $fade   = min(0.6, $period * 0.08);
        $env = function (string $tv, float $from, float $to) use ($fmt, $period, $fade, $D): string {
            $m = 'mod(' . $tv . ',' . $fmt($period) . ')';
            return 'clip(min((' . $m . '-' . $fmt($from) . ')/' . $fmt($fade)
                 . ',(' . $fmt($to) . '-' . $m . ')/' . $fmt($fade) . '),0,1)*lt(' . $tv . ',' . $D . ')';
        };
        // T (uppercase) is geq's time variable, t (lowercase) is drawtext/overlay's
        $trT = $env('T', $period * 0.07, $period * 0.43);
        $trt = $env('t', $period * 0.07, $period * 0.43);
        $blT = $env('T', $period * 0.57, $period * 0.93);
        $blt = $env('t', $period * 0.57, $period * 0.93);

        $geq = fn (string $a): string =>
            "geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*{$fmt($maxOpacity)}*{$a}',format=rgba";

        // Text is drawn twice: a faint offset copy (soft shadow) and the text itself.
        // Both fade with the same expression so no shadow is left behind.
        $text = function (string $s, int $size, string $x, string $y, string $color, float $opacity, string $a) use ($font, $fmt): string {
            $base   = "drawtext=text='{$s}'{$font}:fontsize={$size}";
            $shadow = "{$base}:fontcolor=black:alpha='" . $fmt($opacity * 0.45) . "*{$a}':x='{$x}+1':y='{$y}+1'";
            $main   = "{$base}:fontcolor={$color}:alpha='" . $fmt($opacity) . "*{$a}':x='{$x}':y='{$y}'";
            return $shadow . ',' . $main;
        };

        // Top-right: logo hugs the right edge, text is right-aligned beside it
        $trLx  = $vw - $padX - $lw;
        $trLy  = $padT;
        $trOff = $padX + $lw + $gap;
        $trY1  = $trLy + $textDy;
        $trY2  = $trY1 + $us + 3;

        // Bottom-left: logo hugs the left edge, text is left-aligned beside it
        $blLx = $padX;
        $blLy = $vh - $padB - $lw;
        $blTx = $padX + $lw + $gap;
        $blY1 = $blLy + $textDy;
        $blY2 = $blY1 + $us + 3;

        // ── Outro metrics ─────────────────────────────────────────────────────
        $ol   = max(72, (int) round(min($vw, $vh) * 0.16));
        $bsz  = max(26, (int) round($vw * 0.07));
        $usz  = max(18, (int) round($vw * 0.04));
        $tsz  = max(12, (int) round($vw * 0.026));
        $H    = $ol + 18 + $bsz + 10 + $usz + 16 + $tsz;
        $y0   = (int) (($vh - $H) / 2);
        $yBr  = $y0 + $ol + 18;
        $yUs  = $yBr + $bsz + 10;
        $yTg  = $yUs + $usz + 16;
        $ox   = (int) (($vw - $ol) / 2);

        // 0 → 1 over 0.55s starting `delay` seconds after the outro begins
        $rise = fn (float $delay): string => 'clip((t-' . $D . '-' . $fmt($delay) . ')/0.55,0,1)';
        $yAt  = fn (int $base, float $delay): string => $base . '+18*(1-' . $rise($delay) . ')';
        $rampT = 'clip((T-' . $D . ')/0.55,0,1)';

        $L = [];

        // ── Main video + corner watermarks ────────────────────────────────────
        $L[] = '[0:v]fps=30,setsar=1,format=yuv420p[base]';
        $L[] = "[1:v]format=rgba,scale={$lw}:{$lw},split=2[wa][wb]";
        $L[] = "[wa]{$geq($trT)}[wmtr]";
        $L[] = "[wb]{$geq($blT)}[wmbl]";

        $L[] = "[base][wmtr]overlay=x={$trLx}:y={$trLy}:shortest=1[v1]";
        $L[] = '[v1]'
             . $text($user,   $us, "w-text_w-{$trOff}", (string) $trY1, 'white', 1.0, $trt) . ','
             . $text('flockr', $bs, "w-text_w-{$trOff}", (string) $trY2, 'white', 0.8, $trt)
             . '[v2]';

        $L[] = "[v2][wmbl]overlay=x={$blLx}:y={$blLy}:shortest=1[v3]";
        $L[] = '[v3]'
             . $text($user,   $us, (string) $blTx, (string) $blY1, 'white', 1.0, $blt) . ','
             . $text('flockr', $bs, (string) $blTx, (string) $blY2, 'white', 0.8, $blt)
             . '[v4]';

        // ── Outro: hold last frame, ease it dark, bring in the branding ───────
        $L[] = "[v4]tpad=stop_mode=clone:stop_duration={$out},"
             . "eq=brightness='-{$fmt($dim)}*{$rise(0)}':saturation='1-0.3*{$rise(0)}':eval=frame[v5]";
        $L[] = "[2:v]format=rgba,scale={$ol}:{$ol},{$geq($rampT)}[olg]";
        $L[] = "[v5][olg]overlay=x={$ox}:y='{$yAt($y0, 0)}':enable='gte(t,{$D})':shortest=1[v6]";
        $L[] = '[v6]'
             . $text('flockr', $bsz, '(w-text_w)/2', $yAt($yBr, 0.15), 'white',    1.0,  $rise(0.15)) . ','
             . $text($user,    $usz, '(w-text_w)/2', $yAt($yUs, 0.30), '0xFF6B35', 1.0,  $rise(0.30)) . ','
             . $text('Discover. Shop. Connect.', $tsz, '(w-text_w)/2', $yAt($yTg, 0.45), 'white', 0.65, $rise(0.45))
             . '[outv]';

        // ── Audio: original track, then the outro sound (or silence) ──────────
        $af = 'aformat=sample_fmts=fltp:channel_layouts=stereo';
        $L[] = $hasAudio
            ? "[0:a]aresample=44100,apad,atrim=0:{$D},asetpts=PTS-STARTPTS,{$af}[a0]"
            : "anullsrc=r=44100:cl=stereo,atrim=0:{$D},asetpts=PTS-STARTPTS,{$af}[a0]";
        $L[] = "[3:a]aresample=44100,atrim=0:{$out},apad=whole_dur={$out},asetpts=PTS-STARTPTS,{$af}[a1]";
        $L[] = '[a0][a1]concat=n=2:v=0:a=1[outa]';

        return implode(";\n", $L);
    }

    private function runFFmpeg(
        string $input, string $wmLogo, string $outroLogo,
        string $sound, bool $hasSound,
        string $filterFile, string $output,
        float $dur
    ): void {
        $ff    = $this->ff();
        $out   = self::OUTRO_DURATION;
        $total = $this->fmt($dur + $out + 1);
        $loop  = " -loop 1 -framerate 30 -t {$total}";

        $audioIn = $hasSound
            ? " -i \"" . $this->p($sound) . "\""
            : " -f lavfi -t {$out} -i anullsrc=r=44100:cl=stereo";

        $cmd = "\"{$ff}\" -y"
             . " -i \"" . $this->p($input) . "\""
             . $loop . " -i \"" . $this->p($wmLogo) . "\""
             . $loop . " -i \"" . $this->p($outroLogo) . "\""
             . $audioIn
             . " -/filter_complex \"" . $this->p($filterFile) . "\""
             . " -map \"[outv]\" -map \"[outa]\""
             . " -c:v libx264 -pix_fmt yuv420p -r 30 -preset fast -crf 28"
             . " -c:a aac -ar 44100 -ac 2"
             . " -movflags +faststart"
             . " \"" . $this->p($output) . "\" 2>&1";

        Log::debug('WatermarkVideoJob command', ['cmd' => $cmd]);

        // The font is referenced by bare file name (see buildFontArg), so run from its folder
        $cwd = getcwd();
        if ($this->fontDir) @chdir($this->fontDir);
        try {
            exec($cmd, $lines, $code);
        } finally {
            if ($cwd) @chdir($cwd);
        }

        if ($code !== 0) {
            $tail = implode("\n", array_slice($lines, -25));
            Log::error('WatermarkVideoJob ffmpeg failed', ['code' => $code, 'tail' => $tail]);
            throw new \RuntimeException("FFmpeg failed (code {$code}):\n{$tail}");
        }
    }

    private function fmt(float $v): string
    {
        return sprintf('%.3F', $v); // locale-safe decimal point for FFmpeg expressions
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
        $fp  = str_replace('\\', '/', config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));
        $out = trim(shell_exec("\"{$fp}\" -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 \"" . $this->p($path) . "\" 2>&1") ?? '');
        if (preg_match('/(\d+),(\d+)/', $out, $m)) return [(int) $m[1], (int) $m[2]];
        return [720, 1280];
    }

    private function probeDuration(string $path): float
    {
        $fp  = str_replace('\\', '/', config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));
        $out = trim(shell_exec("\"{$fp}\" -v error -show_entries format=duration -of csv=p=0 \"" . $this->p($path) . "\" 2>&1") ?? '');
        $d   = is_numeric($out) ? (float) $out : 0.0;
        return $d > 0 ? $d : 10.0;
    }

    private function probeHasAudio(string $path): bool
    {
        $fp  = str_replace('\\', '/', config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));
        $out = trim(shell_exec("\"{$fp}\" -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 \"" . $this->p($path) . "\" 2>&1") ?? '');
        return str_contains($out, 'audio');
    }

    private function buildFontArg(): string
    {
        $font = $this->findFont();
        if (!$font) return '';
        // Reference the font by bare file name and run FFmpeg from its folder (see runFFmpeg).
        // This avoids the Windows drive-letter colon ("C:") that breaks drawtext's fontfile option.
        $font          = $this->p($font);
        $this->fontDir = dirname($font);
        return ":fontfile='" . basename($font) . "'";
    }

    private function p(string $path): string
    {
        return str_replace('\\', '/', $path);
    }

    private function ff(): string
{
    return $this->p(config('flockr.ffmpeg_path', '/var/www/bin/ffmpeg'));
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