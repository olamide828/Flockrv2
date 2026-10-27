<?php

namespace App\Http\Controllers;

use App\Models\Sound;
use App\Models\Video;
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
    private const MAX_SECONDS = 150;        // sellers: 2:30 (a video is max 60s; they pick which part to use)
    private const MAX_SECONDS_LIBRARY = 600; // admins adding full tracks to the library

    /**
     * GET /api/sounds?tab=library|creators|mine&q=...&offset=0
     *   library  = licensed tracks (added by an admin or `php artisan sounds:import`)
     *   creators = original sounds from videos whose creator allowed reuse + sounds sellers chose to share
     *   mine     = sounds the signed-in user recorded or uploaded
     */
    public function index(Request $request): JsonResponse
    {
        $tab    = in_array($request->query('tab'), ['creators', 'mine'], true) ? $request->query('tab') : 'library';
        $q      = trim((string) $request->query('q', ''));
        $offset = max(0, (int) $request->query('offset', 0));
        $me     = Auth::id();

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
        ]);
    }

    /**
     * POST /api/sounds  (multipart)
     * A seller records or uploads their own sound. It is converted to MP3 (max 2:30) and kept private
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
            'audio'       => 'required|file|max:25600|mimetypes:audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a,audio/aac,audio/x-aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,video/webm,video/mp4,application/ogg',
            'title'       => 'required|string|max:80',
            'artist'      => 'nullable|string|max:80',
            'is_public'   => 'nullable|boolean',
            'rights'      => 'nullable|boolean',
            'library'     => 'nullable|boolean',
            'license'     => 'nullable|string|max:120',
            'license_url' => 'nullable|url|max:255',
            'attribution' => 'nullable|string|max:255',
        ], [
            'audio.max'       => 'Audio must be under 25MB.',
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

            // Reject (don't silently cut) audio that is too long, so nobody loses the part they wanted
            $limit = $library ? self::MAX_SECONDS_LIBRARY : self::MAX_SECONDS;
            $inDur = trim((string) shell_exec("\"{$fp}\" -v error -show_entries format=duration -of csv=p=0 \"{$p($tmpIn)}\" 2>&1"));
            if (is_numeric($inDur) && (float) $inDur > $limit + 1) {
                $fmt = fn (int $s) => floor($s / 60) . ':' . str_pad((string) ($s % 60), 2, '0', STR_PAD_LEFT);
                return response()->json(['message' => 'That audio is ' . $fmt((int) round((float) $inDur)) . ' long. The limit is ' . $fmt($limit) . '. Trim it and try again.'], 422);
            }

            exec("\"{$ff}\" -y -i \"{$p($tmpIn)}\" -vn -t {$limit} -ac 2 -ar 44100 -c:a libmp3lame -b:a 160k \"{$p($tmpOut)}\" 2>&1", $lines, $code);
            if ($code !== 0 || !file_exists($tmpOut) || filesize($tmpOut) < 2000) {
                Log::warning('Sound convert failed', ['code' => $code, 'tail' => implode("\n", array_slice($lines, -8))]);
                return response()->json(['message' => 'We could not read that audio. Try a different file.'], 422);
            }

            $dur = trim((string) shell_exec("\"{$fp}\" -v error -show_entries format=duration -of csv=p=0 \"{$p($tmpOut)}\" 2>&1"));
            $seconds = is_numeric($dur) ? (int) round((float) $dur) : 0;
            if ($seconds < 1) {
                return response()->json(['message' => 'That audio is too short.'], 422);
            }

            $disk = config('filesystems.default', 'public');
            $dir  = $library ? 'sounds/library' : 'sounds/user';
            $name = Str::lower(Str::random(12)) . '.mp3';
            Storage::disk($disk)->putFileAs($dir, new \Illuminate\Http\File($tmpOut), $name, 'public');

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
