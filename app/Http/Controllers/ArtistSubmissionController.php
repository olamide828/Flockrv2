<?php

namespace App\Http\Controllers;

use App\Models\Sound;
use App\Services\CopyrightMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Artists submit their own tracks. A submission is a normal library Sound that stays hidden (is_active = false)
 * until an admin approves it. user_id is the artist, so the sound page is /@artist/sound/ulid.
 */
class ArtistSubmissionController extends Controller
{
    public const TERMS_VERSION = '2026-11';
    private const MAX_PENDING = 5;
    private const MAX_TOTAL = 50;

    /** GET /artists/submit */
    public function page()
    {
        $u = Auth::user();
        return Inertia::render('Artist/Submit', [
            'genres'  => Sound::GENRES,
            'terms'   => self::TERMS_VERSION,
            'contact' => config('legal.email'),
            'prefill' => $u ? ['stage_name' => $u->name, 'contact_email' => $u->email] : null,
        ]);
    }

    /** GET /api/artist/submissions */
    public function mine(): JsonResponse
    {
        $rows = Sound::where('user_id', Auth::id())->where('is_artist_submission', true)
            ->where('submission_status', '!=', 'withdrawn')->latest('id')->get()
            ->map(fn ($s) => $s->toApi(Auth::id()) + [
                'status'     => $s->submission_status,
                'note'       => $s->submission_note,
                'submitted_at' => $s->submitted_at?->toIso8601String(),
                'reviewed_at'  => $s->reviewed_at?->toIso8601String(),
            ]);
        return response()->json($rows->values());
    }

    /** POST /api/artist/submissions (multipart) */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        abort_unless($user, 401);

        $request->validate([
            'audio'         => 'required|file|max:204800|mimetypes:audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a,audio/aac,audio/x-aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,video/webm,video/mp4,application/ogg',
            'cover'         => 'nullable|image|max:5120',
            'title'         => 'required|string|max:80',
            'artist'        => 'required|string|max:80',
            'genre'         => 'nullable|string|in:' . implode(',', Sound::GENRES),
            'artist_link'   => 'required|url|max:300',
            'legal_name'    => 'required|string|max:120',
            'contact_email' => 'required|email|max:190',
            'own_it'        => 'accepted',
            'allow_use'     => 'accepted',
            'can_remove'    => 'accepted',
        ], [
            'audio.max'          => 'Audio must be under 200MB.',
            'audio.mimetypes'    => 'Use an MP3, M4A, WAV, OGG or WebM audio file.',
            'artist_link.url'    => 'Paste a full link, starting with https://',
            'own_it.accepted'    => 'Please confirm you own this track.',
            'allow_use.accepted' => 'Please confirm you allow Flockr to offer it as a sound.',
            'can_remove.accepted' => 'Please confirm you understand how removal works.',
        ]);

        $pending = Sound::where('user_id', $user->id)->where('is_artist_submission', true)->where('submission_status', 'pending')->count();
        if ($pending >= self::MAX_PENDING) {
            return response()->json(['message' => 'You already have ' . self::MAX_PENDING . ' tracks waiting for review. We will get to them soon.'], 422);
        }
        if (Sound::where('user_id', $user->id)->where('is_artist_submission', true)->count() >= self::MAX_TOTAL) {
            return response()->json(['message' => 'You have reached the submission limit. Contact us to add more.'], 422);
        }

        $upload = $request->file('audio');
        $tmpIn  = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '_in';
        $tmpOut = sys_get_temp_dir() . DIRECTORY_SEPARATOR . Str::uuid() . '_out.mp3';

        try {
            copy($upload->getRealPath(), $tmpIn);
            $p  = fn (string $x) => str_replace('\\', '/', $x);
            $ff = $p(config('flockr.ffmpeg_path', '/var/www/bin/ffmpeg'));
            $fp = $p(config('flockr.ffprobe_path', '/var/www/bin/ffprobe'));

            set_time_limit(300);
            $isMp3 = in_array($upload->getMimeType(), ['audio/mpeg', 'audio/mp3'], true) || strtolower($upload->getClientOriginalExtension()) === 'mp3';
            $final = $tmpIn;
            if (!$isMp3) {
                exec("\"{$ff}\" -y -hide_banner -nostats -loglevel error -i \"{$p($tmpIn)}\" -vn -ac 2 -ar 44100 -c:a libmp3lame -b:a 192k \"{$p($tmpOut)}\" 2>&1", $lines, $code);
                if ($code !== 0 || !file_exists($tmpOut) || filesize($tmpOut) < 2000) {
                    Log::warning('Submission convert failed', ['code' => $code, 'tail' => implode("\n", array_slice($lines, -8))]);
                    return response()->json(['message' => 'We could not read that audio. Try a different file.'], 422);
                }
                $final = $tmpOut;
            }

            $dur = trim((string) shell_exec("\"{$fp}\" -v error -show_entries format=duration -of csv=p=0 \"{$p($final)}\" 2>&1"));
            $seconds = is_numeric($dur) ? (int) round((float) $dur) : 0;
            if ($seconds < 5) {
                return response()->json(['message' => 'We could not read that audio, or it is too short.'], 422);
            }

            $disk = config('filesystems.default', 'public');
            $name = Str::lower(Str::random(12)) . '.mp3';
            Storage::disk($disk)->putFileAs('sounds/submissions', new \Illuminate\Http\File($final), $name, 'public');

            $cover = null;
            if ($request->hasFile('cover')) {
                $c = $request->file('cover');
                $cname = Str::lower(Str::random(12)) . '.' . ($c->guessExtension() ?: 'jpg');
                Storage::disk($disk)->putFileAs('sounds/covers', $c, $cname, 'public');
                $cover = 'sounds/covers/' . $cname;
            }

            $sound = Sound::create([
                'source'               => 'library',
                'user_id'              => $user->id,
                'title'                => trim($request->input('title')),
                'artist'               => trim($request->input('artist')),
                'file_path'            => 'sounds/submissions/' . $name,
                'cover_path'           => $cover,
                'duration'             => $seconds,
                'genre'                => $request->input('genre') ?: null,
                'license'              => 'Artist submission (non-exclusive)',
                'attribution'          => trim($request->input('artist')),
                'is_active'            => false,   // hidden until approved
                'is_public'            => true,
                'is_artist_submission' => true,
                'submission_status'    => 'pending',
                'submitted_at'         => now(),
                'rights_accepted_at'   => now(),
                'terms_version'        => self::TERMS_VERSION,
                'artist_link'          => $request->input('artist_link'),
                'legal_name'           => trim($request->input('legal_name')),
                'contact_email'        => $request->input('contact_email'),
            ]);

            CopyrightMailer::submission($sound->contact_email, $sound->legal_name, $sound->title, 'received');

            return response()->json(['message' => 'Submitted. We will email you once we have reviewed it.', 'sound' => $sound->toApi($user->id) + ['status' => 'pending']], 201);
        } finally {
            @unlink($tmpIn);
            @unlink($tmpOut);
        }
    }

    /** DELETE /api/artist/submissions/{sound} — artist withdraws (pending/approved/rejected). Videos already made keep working only if approved before; we hide it. */
    public function withdraw(Sound $sound): JsonResponse
    {
        abort_unless($sound->is_artist_submission && $sound->user_id === Auth::id(), 404);
        $sound->update(['submission_status' => 'withdrawn', 'is_active' => false, 'reviewed_at' => now()]);
        return response()->json(['message' => 'Track withdrawn. It is no longer offered on Flockr.']);
    }
}
