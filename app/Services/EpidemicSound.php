<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Thin server-side client for the Epidemic Sound Partner API. The key never reaches the browser.
 * Search results are cached for 10 minutes (their terms allow up to 60).
 */
class EpidemicSound
{
    public function enabled(): bool
    {
        return filled(config('epidemic.key'));
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl(rtrim(config('epidemic.base'), '/'))
            ->withToken(config('epidemic.key'))
            ->acceptJson()
            ->timeout(20)
            ->retry(2, 300, throw: false);
    }

    private function fail($res, string $what): never
    {
        $msg = match (true) {
            in_array($res->status(), [401, 403], true) => 'Epidemic Sound rejected our API key.',
            $res->status() === 429                      => 'Epidemic Sound is busy. Try again in a moment.',
            default                                     => "Epidemic Sound could not {$what} (HTTP {$res->status()}).",
        };
        throw new \RuntimeException($msg);
    }

    /** @return array{data: array<int,array>, has_more: bool} */
    public function search(string $term, int $offset = 0, int $limit = 30): array
    {
        $key = 'epidemic:search:' . md5($term . '|' . $offset . '|' . $limit);

        return Cache::remember($key, now()->addMinutes(10), function () use ($term, $offset, $limit) {
            $params = ['limit' => $limit, 'offset' => $offset];
            if ($term !== '') {
                $params['term'] = $term;
            } else {
                $params['sort'] = 'Popularity';
                $params['order'] = 'desc';
            }

            $res = $this->http()->get('/v0/tracks/search', $params);
            if (!$res->successful()) $this->fail($res, 'search');

            $tracks = (array) $res->json('tracks', []);
            return [
                'data'     => array_map(fn ($t) => $this->normalize($t), $tracks),
                'has_more' => $res->json('links.next') !== null && count($tracks) > 0,
            ];
        });
    }

    /** Short-lived preview URL (usually HLS). */
    public function previewUrl(string $trackId): string
    {
        return Cache::remember('epidemic:stream:' . $trackId, now()->addMinutes(5), function () use ($trackId) {
            $res = $this->http()->get('/v0/tracks/' . rawurlencode($trackId) . '/stream');
            if (!$res->successful() || !$res->json('url')) $this->fail($res, 'load the preview');
            return $res->json('url');
        });
    }

    /** Track metadata for one id. */
    public function track(string $trackId): array
    {
        $res = $this->http()->get('/v0/tracks/metadata', ['trackId' => $trackId]);
        if (!$res->successful()) $this->fail($res, 'load the track');
        $t = $res->json('0') ?? $res->json('tracks.0');
        if (!$t) throw new \RuntimeException('Epidemic Sound track not found.');
        return $this->normalize($t);
    }

    /** Downloads the MP3 (normal quality) into a temp file and returns its path. Each call counts as a download. */
    public function downloadToTemp(string $trackId): string
    {
        $res = $this->http()->get('/v0/tracks/' . rawurlencode($trackId) . '/download', ['format' => 'mp3', 'quality' => 'normal']);
        if (!$res->successful() || !$res->json('url')) $this->fail($res, 'download the track');

        $tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '_es.mp3';
        // The download link is a plain CDN URL: no auth header
        $file = Http::timeout(120)->sink($tmp)->get($res->json('url'));
        if (!$file->successful() || !is_file($tmp) || filesize($tmp) < 2000) {
            @unlink($tmp);
            throw new \RuntimeException('Epidemic Sound download failed.');
        }
        return $tmp;
    }

    public function normalize(array $t): array
    {
        $artists = array_values(array_filter(array_merge((array) ($t['mainArtists'] ?? []), (array) ($t['featuredArtists'] ?? []))));
        $img = $t['images'] ?? [];

        return [
            'id'           => 'es:' . $t['id'],
            'external_id'  => $t['id'],
            'title'        => $t['title'] ?? 'Untitled',
            'artist'       => $artists ? implode(', ', $artists) : 'Epidemic Sound',
            'duration'     => (int) ($t['length'] ?? 0),
            'url'          => null,                       // preview is fetched on demand
            'cover_url'    => $img['M'] ?? $img['default'] ?? $img['S'] ?? null,
            'waveform_url' => $t['waveformUrl'] ?? null,
            'source'       => 'epidemic',
            'uses_count'   => 0,
            'mine'         => false,
            'is_public'    => true,
            'attribution'  => null,
        ];
    }
}
