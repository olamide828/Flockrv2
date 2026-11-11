<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessVideoJob;
use App\Models\CopyrightClaim;
use App\Models\Sound;
use App\Models\Video;
use App\Services\CopyrightMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin tools for sounds, copyright claims and video processing. Everything is behind role:admin (see routes).
 * Hidden videos are soft-deleted, so every takedown can be undone with "Restore".
 */
class AdminMusicController extends Controller
{
    /** GET /admin/music */
    public function page(): Response
    {
        return Inertia::render('Admin/Music', [
            'counts' => [
                'open_claims'  => CopyrightClaim::where('status', 'open')->count(),
                'sounds'       => Sound::count(),
                'disabled'     => Sound::where('is_active', false)->count(),
                'stuck_videos' => Video::whereIn('status', ['pending', 'processing'])->count(),
            ],
        ]);
    }

    // ── Copyright claims ─────────────────────────────────────────────────────

    /** GET /api/admin/music/claims?status=open|actioned|rejected|all */
    public function claims(Request $request): JsonResponse
    {
        $q = CopyrightClaim::with(['sound:id,title,artist,source,is_active,user_id', 'video:id,ulid,title,user_id,deleted_at'])->latest();
        $st = $request->query('status', 'open');
        if ($st !== 'all') $q->where('status', $st);

        $page = $q->paginate(20);
        $page->getCollection()->transform(function ($c) {
            $owner = $c->video?->user_id ?? $c->sound?->user_id;
            $c->owner = $owner ? \App\Models\User::withTrashed()->find($owner, ['id', 'name', 'username', 'is_active']) : null;
            $c->videos_using_sound = $c->sound_id ? Video::where('sound_id', $c->sound_id)->count() : 0;
            return $c;
        });
        return response()->json($page);
    }

    /** POST /api/admin/music/claims/{claim}/takedown   { scope: sound|video, note? } */
    public function takedown(Request $request, CopyrightClaim $claim): JsonResponse
    {
        $data = $request->validate(['scope' => 'required|in:sound,video', 'note' => 'nullable|string|max:1000']);
        $videos = collect();

        if ($data['scope'] === 'sound') {
            if (!$claim->sound_id) return response()->json(['message' => 'This claim has no sound attached.'], 422);
            $videos = $this->takedownSound(Sound::findOrFail($claim->sound_id));
        } else {
            if (!$claim->video_id) return response()->json(['message' => 'This claim has no video attached.'], 422);
            $v = Video::find($claim->video_id);
            if ($v) { $v->delete(); $videos = collect([$v]); }
        }

        $claim->update(['status' => 'actioned', 'action_taken' => $data['scope'], 'admin_note' => $data['note'] ?? null, 'actioned_at' => now(), 'actioned_by' => Auth::id()]);

        CopyrightMailer::claimant($claim, 'actioned');
        $suspended = $this->notifySellers($videos, "#{$claim->id}");

        return response()->json(['message' => ($data['scope'] === 'sound' ? "Sound switched off and {$videos->count()} video(s) hidden." : 'Video hidden.')
            . ' The claimant and seller(s) were emailed.' . ($suspended ? " {$suspended} seller(s) reached the strike limit and were suspended." : '')]);
    }

    /** POST /api/admin/music/claims/{claim}/reject   { note? } */
    public function reject(Request $request, CopyrightClaim $claim): JsonResponse
    {
        $claim->update(['status' => 'rejected', 'action_taken' => 'rejected', 'admin_note' => $request->input('note'), 'actioned_at' => now(), 'actioned_by' => Auth::id()]);
        CopyrightMailer::claimant($claim, 'rejected', $request->input('note'));
        return response()->json(['message' => 'Claim rejected. The claimant was emailed. Nothing was removed.']);
    }

    /** POST /api/admin/music/claims/{claim}/restore  (counter-notice won / claim withdrawn) */
    public function restoreClaim(Request $request, CopyrightClaim $claim): JsonResponse
    {
        $n = 0;
        if ($claim->action_taken === 'sound' && $claim->sound_id) {
            Sound::where('id', $claim->sound_id)->update(['is_active' => true]);
            $n = Video::onlyTrashed()->where('sound_id', $claim->sound_id)->restore();
        } elseif ($claim->video_id) {
            $n = Video::onlyTrashed()->where('id', $claim->video_id)->restore();
        }
        $claim->update(['status' => 'rejected', 'action_taken' => 'restored', 'admin_note' => trim(($claim->admin_note ?? '') . ' | restored: ' . $request->input('note', '')), 'actioned_at' => now(), 'actioned_by' => Auth::id()]);
        CopyrightMailer::claimant($claim, 'restored', $request->input('note'));
        return response()->json(['message' => "Restored. {$n} video(s) are live again. The claimant was emailed."]);
    }

    /** GET /api/admin/music/strikes — sellers with videos removed for copyright (suspend with the normal user action) */
    public function strikes(): JsonResponse
    {
        $byUser = $this->strikeCounts();
        arsort($byUser);
        $users = \App\Models\User::withTrashed()->whereIn('id', array_keys($byUser))->get(['id', 'name', 'username', 'is_active'])->keyBy('id');

        return response()->json(['data' => collect($byUser)->map(fn ($n, $uid) => [
            'user' => $users[$uid] ?? null, 'strikes' => $n,
        ])->values()]);
    }

    /** @return array<int,int> seller id => number of separate actioned claims that hit them (one claim = one strike) */
    private function strikeCounts(): array
    {
        $byUser = [];
        foreach (CopyrightClaim::where('status', 'actioned')->get(['video_id', 'sound_id', 'action_taken']) as $c) {
            $owners = ($c->action_taken === 'sound'
                ? Video::withTrashed()->where('sound_id', $c->sound_id)
                : Video::withTrashed()->where('id', $c->video_id))->pluck('user_id')->unique();
            foreach ($owners as $uid) $byUser[$uid] = ($byUser[$uid] ?? 0) + 1;
        }
        return $byUser;
    }

    /** Emails each affected seller and suspends anyone who reached the strike limit. Returns how many were suspended. */
    private function notifySellers($videos, string $ref): int
    {
        $counts    = $this->strikeCounts();
        $limit     = (int) config('legal.auto_suspend_at', 3);
        $suspended = 0;

        foreach ($videos->groupBy('user_id') as $uid => $vids) {
            $u = \App\Models\User::withTrashed()->find($uid);
            if (!$u) continue;
            CopyrightMailer::seller($u->email, $u->name, $vids->count() > 1 ? "{$vids->count()} videos using this music" : ($vids->first()->title ?: 'your video'), $ref);

            if ($limit > 0 && ($counts[$uid] ?? 0) >= $limit && $u->is_active && $u->role !== 'admin' && !$u->trashed()) {
                $u->update(['is_active' => false, 'suspension_reason' => 'Repeated copyright infringement', 'suspended_at' => now()]);
                CopyrightMailer::suspended($u->email, $u->name);
                $suspended++;
            }
        }
        return $suspended;
    }

    // ── Sounds ───────────────────────────────────────────────────────────────

    /** GET /api/admin/music/sounds?search=&source=&state=active|disabled */
    public function sounds(Request $request): JsonResponse
    {
        $q = Sound::query()->withCount('videos');
        $request->query('sort') === 'uses' ? $q->orderByDesc('uses_count')->orderByDesc('id') : $q->latest();
        if ($request->filled('source')) $q->where('source', $request->source);
        if ($request->query('state') === 'active')   $q->where('is_active', true);
        if ($request->query('state') === 'disabled') $q->where('is_active', false);
        if ($request->filled('search')) {
            $like = '%' . addcslashes($request->search, '\\%_') . '%';
            $q->where(fn ($w) => $w->where('title', 'ilike', $like)->orWhere('artist', 'ilike', $like));
        }
        $page = $q->paginate(25);
        $page->getCollection()->transform(fn ($s) => $s->toApi(null) + ['videos_count' => $s->videos_count, 'is_active' => (bool) $s->is_active, 'license' => $s->license, 'license_url' => $s->license_url, 'user_id' => $s->user_id]);
        return response()->json($page);
    }

    /** GET /api/admin/music/submissions?status=pending|approved|rejected */
    public function submissions(Request $request): JsonResponse
    {
        $status = in_array($request->query('status'), ['pending', 'approved', 'rejected'], true) ? $request->query('status') : 'pending';
        $rows = Sound::where('is_artist_submission', true)->where('submission_status', $status)->with('user:id,username,name,email')
            ->orderBy($status === 'pending' ? 'submitted_at' : 'reviewed_at', $status === 'pending' ? 'asc' : 'desc')->limit(100)->get()
            ->map(fn ($s) => $s->toApi(null) + [
                'status' => $s->submission_status, 'note' => $s->submission_note, 'artist_link' => $s->artist_link,
                'legal_name' => $s->legal_name, 'contact_email' => $s->contact_email, 'submitted_at' => $s->submitted_at?->toIso8601String(),
                'rights_accepted_at' => $s->rights_accepted_at?->toIso8601String(), 'terms_version' => $s->terms_version,
                'username' => $s->user?->username,
            ]);
        $pending = Sound::where('is_artist_submission', true)->where('submission_status', 'pending')->count();
        return response()->json(['data' => $rows->values(), 'pending' => $pending]);
    }

    /** POST /api/admin/music/submissions/{sound}/approve */
    public function approveSubmission(Sound $sound): JsonResponse
    {
        abort_unless($sound->is_artist_submission, 404);
        $sound->update(['submission_status' => 'approved', 'is_active' => true, 'submission_note' => null, 'reviewed_at' => now()]);
        \App\Services\CopyrightMailer::submission($sound->contact_email, $sound->legal_name ?: $sound->artist, $sound->title, 'approved', null, url($sound->path()));
        return response()->json(['message' => 'Approved. The track is live in the library.']);
    }

    /** POST /api/admin/music/submissions/{sound}/reject  { reason } */
    public function rejectSubmission(Request $request, Sound $sound): JsonResponse
    {
        abort_unless($sound->is_artist_submission, 404);
        $d = $request->validate(['reason' => 'required|string|max:500']);
        $sound->update(['submission_status' => 'rejected', 'is_active' => false, 'submission_note' => $d['reason'], 'reviewed_at' => now()]);
        \App\Services\CopyrightMailer::submission($sound->contact_email, $sound->legal_name ?: $sound->artist, $sound->title, 'rejected', $d['reason']);
        return response()->json(['message' => 'Rejected and the artist was emailed.']);
    }

    /** PATCH /api/admin/music/sounds/{sound} */
    public function updateSound(Request $request, Sound $sound): JsonResponse
    {
        $d = $request->validate([
            'title' => 'sometimes|string|max:80', 'artist' => 'sometimes|string|max:80',
            'license' => 'sometimes|nullable|string|max:120', 'license_url' => 'sometimes|nullable|url|max:300',
            'attribution' => 'sometimes|nullable|string|max:250', 'is_public' => 'sometimes|boolean',
            'genre' => 'sometimes|nullable|string|in:' . implode(',', Sound::GENRES),
        ]);
        $sound->update($d);
        return response()->json(['message' => 'Sound updated.']);
    }

    /** POST /api/admin/music/sounds/{sound}/toggle — switch a sound on/off without touching the videos */
    public function toggleSound(Sound $sound): JsonResponse
    {
        $sound->update(['is_active' => !$sound->is_active]);
        return response()->json(['message' => $sound->is_active ? 'Sound is available again.' : 'Sound switched off. It no longer shows in the picker.', 'is_active' => $sound->is_active]);
    }

    /** POST /api/admin/music/sounds/{sound}/takedown — switch off AND hide every video using it */
    public function takedownSoundAction(Sound $sound): JsonResponse
    {
        $videos = $this->takedownSound($sound);
        return response()->json(['message' => "Sound switched off and {$videos->count()} video(s) hidden."]);
    }

    /** DELETE /api/admin/music/sounds/{sound} — removes the file too. Videos that used it keep playing (their audio is already mixed in). */
    public function deleteSound(Sound $sound): JsonResponse
    {
        try { Storage::disk(config('filesystems.default', 'public'))->delete($sound->file_path); } catch (\Throwable) {}
        $sound->delete();
        return response()->json(['message' => 'Sound deleted.']);
    }

    /** GET /api/admin/music/sounds/{sound}/videos */
    public function soundVideos(Sound $sound): JsonResponse
    {
        $v = Video::withTrashed()->where('sound_id', $sound->id)->with('user:id,name,username')->latest()->limit(100)
            ->get(['id', 'ulid', 'title', 'user_id', 'status', 'deleted_at']);
        return response()->json(['data' => $v]);
    }

    // ── Videos & processing ──────────────────────────────────────────────────

    /** POST /api/admin/music/videos/{id}/hide */
    public function hideVideo(int $id): JsonResponse
    {
        Video::findOrFail($id)->delete();
        return response()->json(['message' => 'Video hidden.']);
    }

    /** POST /api/admin/music/videos/{id}/restore */
    public function restoreVideo(int $id): JsonResponse
    {
        Video::onlyTrashed()->findOrFail($id)->restore();
        return response()->json(['message' => 'Video restored.']);
    }

    /** POST /api/admin/music/videos/{video}/reprocess — run the optimise/HLS step again for one video */
    // ── Feature switches ─────────────────────────────────────────────────────
    private const SWITCHES = ['music.free_enabled', 'music.epidemic_enabled', 'music.creator_sounds_enabled'];

    public function settings(): JsonResponse
    {
        $out = [];
        foreach (self::SWITCHES as $k) $out[$k] = \App\Models\AppSetting::bool($k);
        $out['epidemic_configured'] = app(\App\Services\EpidemicSound::class)->enabled();
        return response()->json($out);
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $data = $request->validate(['key' => 'required|in:' . implode(',', self::SWITCHES), 'value' => 'required|boolean']);
        \App\Models\AppSetting::set($data['key'], (bool) $data['value']);
        return $this->settings();
    }

    // ── Removed / hidden videos ──────────────────────────────────────────────
    public function removedVideos(): JsonResponse
    {
        $page = Video::onlyTrashed()->with('user:id,name,username')->latest('deleted_at')->paginate(20);
        $page->getCollection()->transform(fn ($v) => [
            'id' => $v->id, 'ulid' => $v->ulid, 'title' => $v->title, 'thumbnail_url_full' => $v->thumbnail_url_full,
            'user' => $v->user ? ['name' => $v->user->name, 'username' => $v->user->username] : null,
            'deleted_at' => optional($v->deleted_at)->toIso8601String(),
        ]);
        return response()->json($page);
    }

    // ── Failed queue jobs ────────────────────────────────────────────────────
    public function failedJobs(): JsonResponse
    {
        $rows = \Illuminate\Support\Facades\DB::table('failed_jobs')->orderByDesc('id')->limit(50)->get()->map(function ($r) {
            $payload = json_decode($r->payload, true);
            return [
                'id' => $r->id, 'uuid' => $r->uuid, 'queue' => $r->queue, 'failed_at' => $r->failed_at,
                'job' => class_basename($payload['displayName'] ?? 'Job'),
                'error' => \Illuminate\Support\Str::limit(strtok($r->exception, "\n"), 300),
            ];
        });
        return response()->json(['data' => $rows]);
    }

    public function retryFailed(string $uuid): JsonResponse
    {
        \Illuminate\Support\Facades\Artisan::call('queue:retry', ['id' => [$uuid]]);
        return response()->json(['message' => 'Job pushed back onto the queue.']);
    }

    public function forgetFailed(string $uuid): JsonResponse
    {
        \Illuminate\Support\Facades\DB::table('failed_jobs')->where('uuid', $uuid)->delete();
        return response()->json(['message' => 'Failed job removed.']);
    }

    public function reprocess(Video $video): JsonResponse
    {
        ProcessVideoJob::dispatch($video);
        return response()->json(['message' => 'Queued. It stays live while it is processed.']);
    }

    /** GET /api/admin/music/stuck — videos still pending/processing */
    public function stuck(): JsonResponse
    {
        return response()->json(['data' => Video::whereIn('status', ['pending', 'processing', 'failed'])->with('user:id,name,username')->latest()->limit(50)->get(['id', 'ulid', 'title', 'user_id', 'status', 'updated_at'])]);
    }

    /** POST /api/admin/music/heal — publish everything that is stuck right now */
    public function heal(): JsonResponse
    {
        Artisan::call('videos:heal', ['--minutes' => 0]);
        return response()->json(['message' => trim(Artisan::output())]);
    }

    /** GET /api/admin/music/diag — the same checks as `php artisan flockr:diag`, shown in the admin */
    public function diag(): JsonResponse
    {
        Artisan::call('flockr:diag');
        return response()->json(['output' => trim(Artisan::output())]);
    }

    // ── shared ───────────────────────────────────────────────────────────────

    /** Switches the sound off and hides every video using it. Returns the hidden videos. */
    private function takedownSound(Sound $sound)
    {
        $sound->update(['is_active' => false]);
        $videos = Video::where('sound_id', $sound->id)->get();
        $videos->each->delete();
        return $videos;
    }
}
