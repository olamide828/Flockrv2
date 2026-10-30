<?php

namespace App\Http\Controllers;

use App\Models\Sound;
use App\Models\Video;
use App\Services\EpidemicSound;
use App\Services\OpenverseAudio;
use Inertia\Inertia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SoundController extends Controller
{
    private const PAGE = 30;
    private const MAX_PER_USER = 30;

    /**
     * GET /api/sounds?tab=library|creators|mine&q=...&offset=0
     *   library  = licensed tracks (added by an admin or `php artisan sounds:import`)
     *   creators = original sounds from videos whose creator allowed reuse + sounds sellers chose to share
     *   mine     = sounds the signed-in user recorded or uploaded
     */
    public function index(Request $request): JsonResponse
    {
        $tab    = in_array($request->query('tab'), ['creators', 'mine', 'epidemic', 'free'], true) ? $request->query('tab') : 'library';
        $q      = trim((string) $request->query('q', ''));
        $offset = max(0, (int) $request->query('offset', 0));
        $me     = Auth::id();
        $es     = app(EpidemicSound::class);
        $meta   = ['epidemic' => $es->enabled()];

        if ($tab === 'free') {
            try {
                $r = app(OpenverseAudio::class)->search($q, intdiv($offset, self::PAGE) + 1, self::PAGE);
            } catch (\Throwable $e) {
                Log::warning('Openverse search failed', ['error' => $e->getMessage()]);
                return response()->json(['message' => $e->getMessage()], 502);
            }
            return response()->json($r + ['meta' => $meta]);
        }

        if ($tab === 'epidemic') {
            if (!$es->enabled()) return response()->json(['data' => [], 'has_more' => false, 'meta' => $meta]);
            try {
                $r = $es->search($q, $offset, self::PAGE);
            } catch (\Throwable $e) {
                Log::warning('Epidemic search failed', ['error' => $e->getMessage()]);
                return response()->json(['message' => $e->getMessage()], 502);
            }
            return response()->json($r + ['meta' => $meta]);
        }

        $query = Sound::active();
        if ($tab === 'library') {
            $query->where('source', 'library');
        } elseif ($tab === 'creators') {
            $query->where(fn ($w) => $w->where('source', 'original')->orWhere(fn ($c) => $c->where('source', 'custom')->where('is_public', true)));
        } else {
            $query->where('user_id', $me)->where('source', 'custom');
        }

        $rows = $query
            ->when($q !== '', function ($qq) use ($q) {
                $like = '%' . addcslashes($q, '\\%_') . '%';
                $qq->where(fn ($w) => $w->where('title', 'ilike', $like)->orWhere('artist', 'ilike', $like));
            })
            ->orderByDesc($tab === 'mine' ? 'id' : 'uses_count')
            ->orderByDesc('id')
            ->offset($offset)
            ->limit(self::PAGE + 1)
            ->get();

        return response()->json([
            'data'     => $rows->take(self::PAGE)->map(fn ($s) => $s->toApi($me))->values(),
            'has_more' => $rows->count() > self::PAGE,
            'meta'     => $meta,
        ]);
    }

    /**
     * POST /api/sounds  (multipart)
     * A seller records or uploads their own sound. It is stored as MP3 (any length) and kept private
     * ("My sounds") unless they choose to share it, in which case they must confirm they hold the rights.
     * Admins can add a track straight to the library (library=1) together with its licence details.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user || !in_array($user->role, ['seller', 'admin'], true)) {
            return response()->json(['message' => 'Only sellers can create sounds.'], 403);
        }
        $isAdmin = $user->role === 'admin';

        $request->validate([
            'audio'       => 'required|file|max:204800|mimetypes:audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a,audio/aac,audio/x-aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,video/webm,video/mp4,application/ogg',
            'title'       => 'required|string|max:80',
            'artist'      => 'nullable|string|max:80',
            'is_public'   => 'nullable|boolean',
            'rights'      => 'nullable|boolean',
            'library'     => 'nullable|boolean',
            'license'     => 'nullable|string|max:120',
            'license_url' => 'nullable|url|max:255',
            'attribution' => 'nullable|string|max:255',
        ], [
            'audio.max'       => 'Audio must be under 200MB.',
            'audio.mimetypes' => 'Use an MP3, M4A, WAV, OGG or WebM audio file.',
        ]);

        $library = $isAdmin && $request->boolean('library');
        $public  = $library || $request->boolean('is_public');
        if (!$library && $public && !$request->boolean('rights')) {
            return response()->json(['message' => 'Confirm you have the rights to this audio before sharing it.', 'errors' => ['rights' => ['Please confirm you have the rights to share this audio.']]], 422);
        }
        if (!$library && Sound::where('user_id', $user->id)->where('source', 'custom')->count() >= self::MAX_PER_USER) {
            return response()->json(['message' => 'You have reached the limit of ' . self::MAX_PER_USER . ' sounds. Delete one to add another.'], 422);
        }

        $upload = $request->file('audio');
        $tmpIn  = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '_in';
        $tmpOut = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '_out.mp3';

        try {
            copy($upload->getRealPath(), $tmpIn);
            $p   = fn (string $x) => str_replace('\\', '/', $x);
            $ff  = $p(config('flockr.ffmpeg_path', '/var/www/bin/ffmpeg'));
            $fp  = $p(config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));

            // No length limit on what people add. (The part of a sound a video can USE is capped at 2:30 in the
            // uploader.) MP3s are stored untouched, so even a very long file is instant; anything else becomes MP3.
            set_time_limit(300);
            $isMp3 = in_array($upload->getMimeType(), ['audio/mpeg', 'audio/mp3'], true) || strtolower($upload->getClientOriginalExtension()) === 'mp3';
            $final = $tmpIn;
            if (!$isMp3) {
                exec("\"{$ff}\" -y -hide_banner -nostats -loglevel error -i \"{$p($tmpIn)}\" -vn -ac 2 -ar 44100 -c:a libmp3lame -b:a 160k \"{$p($tmpOut)}\" 2>&1", $lines, $code);
                if ($code !== 0 || !file_exists($tmpOut) || filesize($tmpOut) < 2000) {
                    Log::warning('Sound convert failed', ['code' => $code, 'tail' => implode("\n", array_slice($lines, -8))]);
                    return response()->json(['message' => 'We could not read that audio. Try a different file.'], 422);
                }
                $final = $tmpOut;
            }

            $dur = trim((string) shell_exec("\"{$fp}\" -v error -show_entries format=duration -of csv=p=0 \"{$p($final)}\" 2>&1"));
            $seconds = is_numeric($dur) ? (int) round((float) $dur) : 0;
            if ($seconds < 1) {
                return response()->json(['message' => 'We could not read that audio, or it is too short.'], 422);
            }

            $disk = config('filesystems.default', 'public');
            $dir  = $library ? 'sounds/library' : 'sounds/user';
            $name = Str::lower(Str::random(12)) . '.mp3';
            Storage::disk($disk)->putFileAs($dir, new \Illuminate\Http\File($final), $name, 'public');

            $sound = Sound::create([
                'source'      => $library ? 'library' : 'custom',
                'user_id'     => $library ? null : $user->id,
                'title'       => trim($request->input('title')),
                'artist'      => trim((string) $request->input('artist')) ?: ($user->username ? '@' . $user->username : 'Creator'),
                'file_path'   => $dir . '/' . $name,
                'duration'    => $seconds,
                'license'     => $library ? $request->input('license') : null,
                'license_url' => $library ? $request->input('license_url') : null,
                'attribution' => $library ? $request->input('attribution') : null,
                'is_active'   => true,
                'is_public'   => $public,
            ]);

            return response()->json(['message' => 'Sound saved.', 'sound' => $sound->toApi($user->id)], 201);
        } finally {
            @unlink($tmpIn);
            @unlink($tmpOut);
        }
    }

    /** GET /api/sounds/epidemic/{trackId}/preview → { url } (short-lived stream link) */
    public function epidemicPreview(string $trackId): JsonResponse
    {
        $es = app(EpidemicSound::class);
        abort_unless($es->enabled(), 404);
        try {
            return response()->json(['url' => $es->previewUrl($trackId)]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    /**
     * POST /api/sounds/epidemic/{trackId}/import
     * Copies a track into our sounds table the first time someone uses it (so the video mixer can read it).
     * One download per track, ever: later uses reuse the stored copy.
     */
    public function epidemicImport(string $trackId): JsonResponse
    {
        $user = Auth::user();
        if (!$user || !in_array($user->role, ['seller', 'admin'], true)) {
            return response()->json(['message' => 'Only sellers can use this.'], 403);
        }
        $es = app(EpidemicSound::class);
        abort_unless($es->enabled(), 404);

        $existing = Sound::where('source', 'epidemic')->where('external_id', $trackId)->first();
        if ($existing) {
            if (!$existing->is_active) return response()->json(['message' => 'This track is no longer available.'], 410);
            return response()->json(['sound' => $existing->toApi($user->id)]);
        }

        $tmp = null;
        try {
            $meta = $es->track($trackId);
            $tmp  = $es->downloadToTemp($trackId);

            $disk = config('filesystems.default', 'public');
            $name = 'sounds/epidemic/' . Str::lower(Str::random(14)) . '.mp3';
            Storage::disk($disk)->putFileAs('sounds/epidemic', new \Illuminate\Http\File($tmp), basename($name), 'public');

            $sound = Sound::create([
                'source'      => 'epidemic',
                'external_id' => $trackId,
                'title'       => Str::limit($meta['title'], 80, ''),
                'artist'      => Str::limit($meta['artist'], 80, ''),
                'file_path'   => $name,
                'cover_path'  => $meta['cover_url'],
                'duration'    => $meta['duration'],
                'license'     => 'Epidemic Sound',
                'license_url' => 'https://www.epidemicsound.com/',
                'is_active'   => true,
                'is_public'   => true,
            ]);

            return response()->json(['sound' => $sound->toApi($user->id)], 201);
        } catch (\Throwable $e) {
            Log::warning('Epidemic import failed', ['track' => $trackId, 'error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 502);
        } finally {
            if ($tmp) @unlink($tmp);
        }
    }

    /**
     * POST /api/sounds/free/{id}/import   (Openverse track id)
     * Copies a free-licence track into our storage the first time someone uses it. The credit line is kept
     * in sounds.attribution and shown with the video.
     */
    public function freeImport(string $id): JsonResponse
    {
        $user = Auth::user();
        if (!$user || !in_array($user->role, ['seller', 'admin'], true)) {
            return response()->json(['message' => 'Only sellers can use this.'], 403);
        }
        $existing = Sound::where('source', 'openverse')->where('external_id', $id)->first();
        if ($existing) {
            if (!$existing->is_active) return response()->json(['message' => 'This track is no longer available.'], 410);
            return response()->json(['sound' => $existing->toApi($user->id)]);
        }

        $tmp = null;
        try {
            set_time_limit(180);
            $ov   = app(OpenverseAudio::class);
            $meta = $ov->track($id);
            [$tmp, $secs] = $ov->downloadMp3($meta['_raw_url'], config('flockr.ffmpeg_path', '/var/www/bin/ffmpeg'), config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));

            $disk = config('filesystems.default', 'public');
            $name = 'sounds/free/' . Str::lower(Str::random(14)) . '.mp3';
            Storage::disk($disk)->putFileAs('sounds/free', new \Illuminate\Http\File($tmp), basename($name), 'public');

            $sound = Sound::create([
                'source'      => 'openverse',
                'external_id' => $id,
                'title'       => Str::limit($meta['title'], 80, ''),
                'artist'      => Str::limit($meta['artist'], 80, ''),
                'file_path'   => $name,
                'cover_path'  => $meta['cover_url'],
                'duration'    => $secs ?: $meta['duration'],
                'license'     => $meta['_license'],
                'license_url' => $meta['_license_url'],
                'attribution' => Str::limit($meta['attribution'], 250, ''),
                'is_active'   => true,
                'is_public'   => true,
            ]);

            return response()->json(['sound' => $sound->toApi($user->id)], 201);
        } catch (\Throwable $e) {
            Log::warning('Free sound import failed', ['track' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 502);
        } finally {
            if ($tmp) @unlink($tmp);
        }
    }

    // ── Sound page: everything that uses one sound ─────────────────────────────

    private function canView(Sound $s): bool
    {
        if (!$s->is_active) return false;
        if ($s->source !== 'custom' || $s->is_public) return true;
        $u = Auth::user();
        return $u && ($u->id === $s->user_id || $u->role === 'admin');
    }

    /** Videos that use this sound (music videos) plus the video the sound was taken from. */
    private function videosQuery(Sound $sound)
    {
        return Video::active()
            ->where(fn ($q) => $q->where('sound_id', $sound->id)->when($sound->video_id, fn ($w) => $w->orWhere('id', $sound->video_id)))
            ->with(['user:id,name,username,avatar,is_verified,location', 'sound'])
            ->latest('published_at');
    }

    /** GET /sound/{sound}  (Inertia page) */
    public function page(Sound $sound)
    {
        abort_unless($this->canView($sound), 404);

        $q = $this->videosQuery($sound);
        $total = (clone $q)->count();
        $rows = $q->simplePaginate(18);

        return Inertia::render('Sound/Show', [
            'sound'    => $sound->toApi(Auth::id()),
            'total'    => $total,
            'videos'   => $rows->items(),
            'has_more' => $rows->hasMorePages(),
        ]);
    }

    /** GET /sound/from-video/{ulid}  → the sound page of a video's own (original) sound */
    public function fromVideo(string $ulid)
    {
        $video = Video::where('ulid', $ulid)->firstOrFail();
        $id = $video->sound_id
            ?: Sound::active()->where('source', 'original')->where('video_id', $video->id)->value('id');
        abort_unless($id, 404);

        return redirect('/sound/' . $id);
    }

    /** GET /api/sounds/{sound}  (used by "Use this sound" in the uploader) */
    public function show(Sound $sound): JsonResponse
    {
        abort_unless($this->canView($sound), 404);
        return response()->json(['sound' => $sound->toApi(Auth::id())]);
    }

    /** GET /api/sounds/{sound}/videos?page=N  ("Load more" on the sound page) */
    public function videos(Sound $sound): JsonResponse
    {
        abort_unless($this->canView($sound), 404);
        $rows = $this->videosQuery($sound)->simplePaginate(18);

        return response()->json(['data' => $rows->items(), 'has_more' => $rows->hasMorePages()]);
    }

    /** DELETE /api/sounds/{sound}  (owner or admin). Videos that already used it keep their baked-in audio. */
    public function destroy(Sound $sound): JsonResponse
    {
        $user = Auth::user();
        if (!$user || ($sound->user_id !== $user->id && $user->role !== 'admin') || $sound->source === 'original' && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try { Storage::disk(config('filesystems.default', 'public'))->delete($sound->file_path); } catch (\Throwable) {}
        $sound->delete();

        return response()->json(['message' => 'Sound deleted.']);
    }
}
