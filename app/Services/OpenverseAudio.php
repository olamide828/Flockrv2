<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Free music from Openverse (api.openverse.org), the open-licence search engine run by WordPress. No key needed.
 * We only ever show tracks under licences that allow commercial use WITHOUT share-alike: CC0, Public Domain Mark
 * and CC BY. CC BY needs credit, which we store in sounds.attribution and show under every video that uses it.
 */
class OpenverseAudio
{
    private const BASE    = 'https://api.openverse.org/v1';
    public const ALLOWED  = ['cc0', 'pdm', 'by'];

    private function http()
    {
        return Http::baseUrl(self::BASE)->acceptJson()->timeout(20)->retry(2, 300, throw: false)
            ->withHeaders(['User-Agent' => 'Flockr/1.0 (+' . config('app.url') . ')']);
    }

    /** @return array{data: array<int,array>, has_more: bool} */
    public function search(string $term, int $page = 1, int $size = 30): array
    {
        $term = $term !== '' ? $term : 'instrumental';          // an empty search still shows something useful
        return Cache::remember('openverse:search:' . md5("$term|$page|$size"), now()->addMinutes(10), function () use ($term, $page, $size) {
            $res = $this->http()->get('/audio/', [
                'q' => $term, 'category' => 'music', 'license' => implode(',', self::ALLOWED),
                'page' => $page, 'page_size' => $size,
            ]);
            if (!$res->successful()) {
                throw new \RuntimeException($res->status() === 429 ? 'The free music service is busy. Try again in a moment.' : 'Could not load free music right now.');
            }
            $rows = collect((array) $res->json('results', []))
                ->filter(fn ($t) => $this->licenseOk($t) && filled($t['url'] ?? null))
                ->map(fn ($t) => $this->normalize($t))->values()->all();

            return ['data' => $rows, 'has_more' => $page < (int) $res->json('page_count', 1)];
        });
    }

    public function track(string $id): array
    {
        $res = $this->http()->get('/audio/' . rawurlencode($id) . '/');
        if (!$res->successful()) throw new \RuntimeException('That track is no longer available.');
        $t = (array) $res->json();
        if (!$this->licenseOk($t)) throw new \RuntimeException('That track\'s licence does not allow use in videos.');
        return $this->normalize($t) + ['_raw_url' => $t['url'] ?? null, '_license_url' => $t['license_url'] ?? null, '_license' => strtoupper((string) ($t['license'] ?? ''))];
    }

    /** Downloads (max 80 MB) and converts to MP3 in a temp file. Returns [path, seconds]. */
    public function downloadMp3(string $url, string $ffmpeg, string $ffprobe): array
    {
        $raw = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '_ov_in';
        $out = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '_ov.mp3';
        try {
            $r = Http::timeout(120)->withOptions(['sink' => $raw])->get($url);
            if (!$r->successful() || !is_file($raw) || filesize($raw) < 2000) throw new \RuntimeException('Download failed.');
            if (filesize($raw) > 80 * 1024 * 1024) throw new \RuntimeException('That track is too large.');

            $p = fn ($x) => str_replace('\\', '/', $x);
            exec("\"{$p($ffmpeg)}\" -y -hide_banner -nostats -loglevel error -i \"{$p($raw)}\" -vn -ac 2 -ar 44100 -c:a libmp3lame -b:a 160k \"{$p($out)}\" 2>&1", $l, $code);
            if ($code !== 0 || !is_file($out) || filesize($out) < 2000) throw new \RuntimeException('Could not read that audio file.');

            $dur = (float) trim((string) shell_exec("\"{$p($ffprobe)}\" -v error -show_entries format=duration -of csv=p=0 \"{$p($out)}\" 2>&1"));
            return [$out, (int) round($dur)];
        } catch (\Throwable $e) {
            @unlink($out);
            throw $e;
        } finally {
            @unlink($raw);
        }
    }

    private function licenseOk(array $t): bool
    {
        return in_array(strtolower((string) ($t['license'] ?? '')), self::ALLOWED, true);
    }

    public function normalize(array $t): array
    {
        $lic = strtoupper((string) ($t['license'] ?? ''));
        $ver = $t['license_version'] ?? null;
        $by  = $t['creator'] ?? null;
        $credit = trim(($t['title'] ?? 'Untitled') . ($by ? " by {$by}" : '') . ' — '
            . ($lic === 'CC0' ? 'CC0' : ($lic === 'PDM' ? 'Public Domain' : "CC {$lic}" . ($ver ? " {$ver}" : ''))));

        $ms = (float) ($t['duration'] ?? 0);                    // Openverse reports milliseconds

        return [
            'id'           => 'ov:' . $t['id'],
            'external_id'  => (string) $t['id'],
            'title'        => $t['title'] ?? 'Untitled',
            'artist'       => $by ?: 'Unknown artist',
            'duration'     => (int) round($ms > 0 ? $ms / 1000 : 0),
            'url'          => $t['url'] ?? null,               // direct, so the picker can preview it
            'cover_url'    => $t['thumbnail'] ?? null,
            'waveform_url' => null,
            'source'       => 'openverse',
            'uses_count'   => 0,
            'mine'         => false,
            'is_public'    => true,
            'attribution'  => $credit,
        ];
    }
}
