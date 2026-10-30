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

    /** FFmpeg runs from this folder so fonts and text files can be referenced by bare name. */
    private ?string $fontDir = null;

    /** Temp files created for this run (font copies, overlay text files), removed in handle(). */
    private array $scratch = [];

    /** source font path => bare file name of its copy in the temp folder */
    private array $fontCopies = [];

    private ?string $scratchId = null;

    /**
     * PNG text layers (v2 overlays) fetched for this run. Each entry:
     * ['file' => local path, 'w' => px, 'h' => px, 'x' => px, 'y' => px]. They are FFmpeg inputs 4, 5, ...
     */
    private array $layers = [];

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

            // 2b. Creator text from the new editor arrives as PNG layers rendered in the editor's own fonts
            $this->prepareOverlayLayers($vw, $vh, $tmp . $uuid);

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
            foreach (array_merge([$tmpInput, $tmpOutput, $filterFile], $this->scratch) as $f) {
                @unlink($f);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Watermark + outro in ONE FFmpeg pass.
    //
    // Watermark: a small logo / flockr / @username stack that fades in and out at the
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

        // "Enhance" look chosen by the creator (same recipe as the CSS filter used on playback)
        $enhance = $this->video->enhance ? ',eq=contrast=1.07:saturation=1.14:brightness=0.02,unsharp=5:5:0.5:5:5:0.0' : '';

        // Tunables
        $maxOpacity = 0.92;   // peak watermark opacity
        $dim        = 0.42;   // outro darkness (0 = none, 1 = black)

        // ── Watermark metrics ─────────────────────────────────────────────────
        // Each corner is a vertical stack: logo, then "flockr", then @username
        $lw   = max(26, (int) round($vw * 0.075));   // logo size
        $gap  = max(5,  (int) round($vw * 0.012));   // space between stack items
        $bs   = max(14, (int) round($vw * 0.038));   // "flockr" size
        $us   = max(12, (int) round($vw * 0.029));   // @username size
        $padX = max(16, (int) round($vw * 0.045));
        $padT = max(20, (int) round($vh * 0.045));
        $padB = max(24, (int) round($vh * 0.06));
        $stackH = $lw + $gap + $bs + 3 + $us;

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

        // Top-right: stack is right-aligned to the right margin
        $trLx = $vw - $padX - $lw;
        $trLy = $padT;
        $trY1 = $trLy + $lw + $gap;   // "flockr"
        $trY2 = $trY1 + $bs + 3;      // @username
        $trX  = "w-text_w-{$padX}";

        // Bottom-left: same stack, left-aligned to the left margin
        $blLx = $padX;
        $blLy = $vh - $padB - $stackH;
        $blY1 = $blLy + $lw + $gap;
        $blY2 = $blY1 + $bs + 3;
        $blX  = (string) $padX;

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
        // Creator text overlays go on first, so they are also part of the frozen, dimmed outro frame
        $draws = $this->buildOverlayDraws($vw, $vh);
        $nl    = count($this->layers);
        if ($draws === '' && $nl === 0) {
            $L[] = '[0:v]fps=30,setsar=1' . $enhance . ',format=yuv420p[base]';
        } else {
            $L[] = '[0:v]fps=30,setsar=1' . $enhance . ',format=yuv420p[b0]';
            $cur = 'b0';
            if ($draws !== '') {
                $L[] = '[b0]' . $draws . ($nl === 0 ? '[base]' : '[bd]');
                $cur = 'bd';
            }
            foreach ($this->layers as $i => $ly) {
                $in   = 4 + $i;
                $next = $i === $nl - 1 ? 'base' : 'bl' . $i;
                $L[]  = "[{$in}:v]format=rgba,scale={$ly['w']}:{$ly['h']}[ly{$i}]";
                $L[]  = "[{$cur}][ly{$i}]overlay=x={$ly['x']}:y={$ly['y']}:shortest=1[{$next}]";
                $cur  = $next;
            }
        }
        $L[] = "[1:v]format=rgba,scale={$lw}:{$lw},split=2[wa][wb]";
        $L[] = "[wa]{$geq($trT)}[wmtr]";
        $L[] = "[wb]{$geq($blT)}[wmbl]";

        $L[] = "[base][wmtr]overlay=x={$trLx}:y={$trLy}:shortest=1[v1]";
        $L[] = '[v1]'
             . $text('flockr', $bs, $trX, (string) $trY1, 'white', 1.0,  $trt) . ','
             . $text($user,    $us, $trX, (string) $trY2, 'white', 0.85, $trt)
             . '[v2]';

        $L[] = "[v2][wmbl]overlay=x={$blLx}:y={$blLy}:shortest=1[v3]";
        $L[] = '[v3]'
             . $text('flockr', $bs, $blX, (string) $blY1, 'white', 1.0,  $blt) . ','
             . $text($user,    $us, $blX, (string) $blY2, 'white', 0.85, $blt)
             . '[v4]';

        // ── Outro: hold last frame, ease it dark, bring in the branding ───────
        $L[] = "[v4]tpad=stop_mode=clone:stop_duration={$out},"
             . "eq=brightness='-{$fmt($dim)}*{$rise(0)}':saturation='1-0.3*{$rise(0)}':eval=frame[v5]";
        $L[] = "[2:v]format=rgba,scale={$ol}:{$ol},{$geq($rampT)}[olg]";
        $L[] = "[v5][olg]overlay=x={$ox}:y='{$yAt($y0, 0)}':enable='gte(t,{$D})':shortest=1[v6]";
        $L[] = '[v6]'
             . $text('flockr', $bsz, '(w-text_w)/2', $yAt($yBr, 0.15), 'white',    1.0,  $rise(0.15)) . ','
             . $text($user,    $usz, '(w-text_w)/2', $yAt($yUs, 0.30), '0xFF6B35', 1.0,  $rise(0.30)) . ','
             . $text('Shop What You Watch', $tsz, '(w-text_w)/2', $yAt($yTg, 0.45), 'white', 0.65, $rise(0.45))
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
             . $this->layerInputs($loop)
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

    /** Width / height as FFmpeg will see them: a phone video flagged "rotated 90°" is swapped. */
    private function probeDimensions(string $path): array
    {
        $fp  = str_replace('\\', '/', config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));
        $raw = shell_exec("\"{$fp}\" -v error -select_streams v:0 -show_entries stream=width,height:stream_tags=rotate:stream_side_data=rotation -of json \"" . $this->p($path) . "\" 2>&1") ?? '';
        $j   = json_decode($raw, true);
        $st  = is_array($j) ? ($j['streams'][0] ?? null) : null;
        if (is_array($st) && !empty($st['width']) && !empty($st['height'])) {
            $rot = (int) ($st['tags']['rotate'] ?? 0);
            foreach ($st['side_data_list'] ?? [] as $sd) {
                if (isset($sd['rotation'])) $rot = (int) $sd['rotation'];
            }
            $swap = abs($rot) % 180 === 90;
            return $swap ? [(int) $st['height'], (int) $st['width']] : [(int) $st['width'], (int) $st['height']];
        }
        if (preg_match('/(\d+),(\d+)/', $raw, $m)) return [(int) $m[1], (int) $m[2]];
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

    private function scratchDir(): string
    {
        $this->fontDir ??= rtrim($this->p(sys_get_temp_dir()), '/');
        return $this->fontDir;
    }

    private function scratchName(string $suffix): string
    {
        $this->scratchId ??= (string) Str::uuid();
        return $this->scratchId . $suffix;
    }

    /**
     * ":fontfile='name.ttf'" for drawtext. The font is copied into the temp folder and
     * referenced by bare file name (FFmpeg runs from that folder), which avoids the
     * Windows drive-letter colon that breaks drawtext's fontfile option.
     */
    private function buildFontArg(string $style = 'bold'): string
    {
        $src = $this->findFont($style);
        if (!$src) return '';
        $src = $this->p($src);

        if (!isset($this->fontCopies[$src])) {
            $name = $this->scratchName('_font' . count($this->fontCopies) . '.ttf');
            if (!@copy($src, $this->scratchDir() . '/' . $name)) return '';
            $this->scratch[]         = $this->scratchDir() . '/' . $name;
            $this->fontCopies[$src]  = $name;
        }
        return ":fontfile='" . $this->fontCopies[$src] . "'";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Creator text overlays (Video::text_overlays, saved by Seller/Upload.jsx)
    //
    // Each overlay: text, textColor, outlineColor, showOutline, fontSize, fontStyle,
    // top / left (% of the editor frame) and, from the new uploader, frame_w /
    // frame_h / font_ratio. The editor shows the video "cover"-fitted inside its
    // frame, so positions are mapped onto the part of the video that was visible.
    // ─────────────────────────────────────────────────────────────────────────
    private function buildOverlayDraws(int $vw, int $vh): string
    {
        $overlays = $this->video->text_overlays;
        if (!is_array($overlays) || !$overlays) return '';

        $draws = [];
        foreach (array_slice($overlays, 0, 20) as $i => $o) {
            if (!is_array($o)) continue;
            if (($o['v'] ?? 0) === 2) continue;   // v2 text comes in as PNG layers (prepareOverlayLayers)

            $text = trim(preg_replace('/[^\P{C}\n]/u', '', (string) ($o['text'] ?? '')));
            if ($text === '') continue;

            // Visible region of the video inside the editor frame (cover fit, centred)
            $fw     = (float) ($o['frame_w'] ?? 260);
            $fh     = (float) ($o['frame_h'] ?? 462.22);
            $aspect = ($fw > 0 && $fh > 0) ? $fw / $fh : 9 / 16;
            if ($vw / $vh > $aspect) { $visH = $vh; $visW = $vh * $aspect; }
            else                     { $visW = $vw; $visH = $vw / $aspect; }
            $offX = ($vw - $visW) / 2;
            $offY = ($vh - $visH) / 2;

            $ratio = isset($o['font_ratio'])
                ? (float) $o['font_ratio']
                : (float) ($o['fontSize'] ?? 20) / ($fw > 0 ? $fw : 260);
            $fs = max(10, (int) round(min(max($ratio, 0.02), 0.25) * $visW));

            $x = (int) round($offX + min(100, max(0, (float) ($o['left'] ?? 10))) / 100 * $visW);
            $y = (int) round($offY + min(100, max(0, (float) ($o['top']  ?? 20))) / 100 * $visH);

            $wrapped = $this->wrapText($text, (int) floor(0.77 * $visW / ($fs * 0.58)));

            $file = $this->scratchName('_t' . $i . '.txt');
            file_put_contents($this->scratchDir() . '/' . $file, $wrapped);
            $this->scratch[] = $this->scratchDir() . '/' . $file;

            $style = ($o['fontStyle'] ?? '') === 'italic' ? 'bolditalic' : 'bold';
            $color = $this->hexColor($o['textColor'] ?? null, '0xFFFFFF');

            $d = "drawtext=textfile='{$file}':expansion=none" . $this->buildFontArg($style)
               . ":fontsize={$fs}:fontcolor={$color}:line_spacing=" . (int) round($fs * 0.15)
               . ":x={$x}:y={$y}";

            if (!empty($o['showOutline'])) {
                $d .= ':borderw=' . max(2, (int) round($fs * 0.11))
                    . ':bordercolor=' . $this->hexColor($o['outlineColor'] ?? null, '0x000000');
            } else {
                $d .= ':shadowcolor=black@0.7:shadowx=0:shadowy=2';
            }
            $draws[] = $d;
        }

        return implode(',', $draws);
    }

    /**
     * Fetches the PNG for every v2 overlay (stored by VideoController at overlays/{ulid}/{n}.png) and works
     * out where it sits on the video. The editor shows the video cover-fitted in its frame, so the saved
     * centre (cx, cy in % of that frame) is mapped onto the part of the video that was visible.
     * The PNG was rendered at png_scale video-px per editor-px; if this file's size differs from the one the
     * browser saw, the layer is rescaled by the ratio.
     */
    private function prepareOverlayLayers(int $vw, int $vh, string $tmpBase): void
    {
        $this->layers = [];
        $overlays = $this->video->text_overlays;
        if (!is_array($overlays) || !$overlays || !$this->video->ulid) return;

        $disk = config('filesystems.default', 'public');

        foreach (array_slice($overlays, 0, 20) as $o) {
            if (!is_array($o) || ($o['v'] ?? 0) !== 2 || !isset($o['png_index'])) continue;
            $idx = (int) $o['png_index'];
            if ($idx < 0 || $idx > 19) continue;

            $remote = 'overlays/' . $this->video->ulid . '/' . $idx . '.png';
            try {
                if (!Storage::disk($disk)->exists($remote)) continue;
                $stream = Storage::disk($disk)->readStream($remote);
                if (!$stream) continue;
                $local = $tmpBase . '_ov' . $idx . '.png';
                $out   = fopen($local, 'wb');
                stream_copy_to_stream($stream, $out);
                fclose($out); fclose($stream);
                $this->scratch[] = $local;
            } catch (\Throwable $e) {
                Log::warning('Overlay PNG unavailable', ['path' => $remote, 'error' => $e->getMessage()]);
                continue;
            }

            $size = @getimagesize($local);
            $pw   = (int) ($o['png_w'] ?? ($size[0] ?? 0));
            $ph   = (int) ($o['png_h'] ?? ($size[1] ?? 0));
            if ($size) { $pw = $size[0]; $ph = $size[1]; }   // trust the file over the JSON
            if ($pw < 2 || $ph < 2) continue;

            $fw     = (float) ($o['frame_w'] ?? 0);
            $fh     = (float) ($o['frame_h'] ?? 0);
            if ($fw < 1 || $fh < 1) continue;
            $aspect = $fw / $fh;
            if ($vw / $vh > $aspect) { $visH = $vh; $visW = $vh * $aspect; }
            else                     { $visW = $vw; $visH = $vw / $aspect; }
            $offX = ($vw - $visW) / 2;
            $offY = ($vh - $visH) / 2;

            $kServer = $visW / $fw;
            $pngS    = (float) ($o['png_scale'] ?? 0);
            $oScale  = max(0.01, (float) ($o['scale'] ?? 1));
            $factor  = $pngS > 0 ? $kServer / ($pngS / $oScale) : 1.0;
            if (abs($factor - 1) < 0.02) $factor = 1.0;
            $factor  = min(4.0, max(0.1, $factor));

            $w = max(2, (int) round($pw * $factor));
            $h = max(2, (int) round($ph * $factor));
            $cx = $offX + min(100, max(0, (float) ($o['cx'] ?? 50))) / 100 * $visW;
            $cy = $offY + min(100, max(0, (float) ($o['cy'] ?? 50))) / 100 * $visH;

            $this->layers[] = [
                'file' => $local,
                'w'    => $w,
                'h'    => $h,
                'x'    => (int) round($cx - $w / 2),
                'y'    => (int) round($cy - $h / 2),
            ];
        }
    }

    /** " -loop 1 ... -i layer.png" for each text layer (FFmpeg inputs 4+). */
    private function layerInputs(string $loop): string
    {
        $s = '';
        foreach ($this->layers as $ly) {
            $s .= $loop . ' -i "' . $this->p($ly['file']) . '"';
        }
        return $s;
    }

    private function hexColor(mixed $c, string $fallback): string
    {
        return is_string($c) && preg_match('/^#([0-9a-fA-F]{6})$/', $c, $m) ? '0x' . strtoupper($m[1]) : $fallback;
    }

    /** Greedy word wrap that keeps the creator's own line breaks (estimate: no font metrics here). */
    private function wrapText(string $text, int $maxChars): string
    {
        $maxChars = max(6, $maxChars);
        $out = [];
        foreach (preg_split('/\R/u', $text) as $para) {
            $line = '';
            foreach (preg_split('/\s+/u', trim($para), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $word) {
                while (mb_strlen($word) > $maxChars) {           // very long word: hard split
                    if ($line !== '') { $out[] = $line; $line = ''; }
                    $out[] = mb_substr($word, 0, $maxChars);
                    $word  = mb_substr($word, $maxChars);
                }
                $try = $line === '' ? $word : $line . ' ' . $word;
                if (mb_strlen($try) > $maxChars) { $out[] = $line; $line = $word; }
                else                             { $line = $try; }
            }
            $out[] = $line;
        }
        return implode("\n", $out);
    }

    private function p(string $path): string
    {
        return str_replace('\\', '/', $path);
    }

    private function ff(): string
{
    return $this->p(config('flockr.ffmpeg_path', '/var/www/bin/ffmpeg'));
}

    private function findFont(string $style = 'bold'): ?string
    {
        $lists = [
            'bolditalic' => [
                'C:/Windows/Fonts/arialbi.ttf',
                'C:/Windows/Fonts/calibriz.ttf',
                public_path('fonts/Inter-BoldItalic.ttf'),
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf',
            ],
            'bold' => [
                'C:/Windows/Fonts/arialbd.ttf',
                'C:/Windows/Fonts/arial.ttf',
                'C:/Windows/Fonts/calibrib.ttf',
                public_path('fonts/Inter-Bold.ttf'),
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            ],
        ];

        // Italic falls back to the plain bold font if no italic font is installed
        foreach (array_merge($lists[$style] ?? [], $lists['bold']) as $f) {
            if (file_exists($this->p($f))) return $f;
        }
        return null;
    }
}
