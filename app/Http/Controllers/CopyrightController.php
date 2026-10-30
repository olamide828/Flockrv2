<?php

namespace App\Http\Controllers;

use App\Models\CopyrightClaim;
use App\Models\Sound;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

/** Public copyright page + claim form. Anyone (logged in or not) can report; no account needed. */
class CopyrightController extends Controller
{
    /** GET /copyright?sound=ID | ?video=ULID */
    public function page(Request $request): Response
    {
        $sound = $request->filled('sound') ? Sound::find((int) $request->query('sound')) : null;
        $video = $request->filled('video') ? Video::where('ulid', $request->query('video'))->first() : null;

        return Inertia::render('Legal/Copyright', [
            'email'  => config('legal.email'),
            'target' => [
                'sound_id' => $sound?->id,
                'video'    => $video?->ulid,
                'label'    => $sound ? "Sound: {$sound->title}" : ($video ? 'Video ' . $video->ulid : null),
            ],
        ]);
    }

    /** POST /api/copyright-claim  (throttled in routes) */
    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'claimant_name'  => 'required|string|max:120',
            'claimant_email' => 'required|email|max:160',
            'details'        => 'required|string|min:20|max:4000',
            'sound_id'       => 'nullable|integer|exists:sounds,id',
            'video'          => 'nullable|string|max:40',
            'confirm'        => 'accepted',
        ], ['confirm.accepted' => 'Please confirm the statement.', 'details.min' => 'Please describe the problem (at least 20 characters).']);

        $video = !empty($data['video']) ? Video::where('ulid', $data['video'])->first() : null;
        if (empty($data['sound_id']) && !$video) {
            return response()->json(['message' => 'Tell us which sound or video this is about (paste its link).', 'errors' => ['details' => ['Paste the link to the video or sound.']]], 422);
        }

        $claim = CopyrightClaim::create([
            'video_id'         => $video?->id,
            'sound_id'         => $data['sound_id'] ?? $video?->sound_id,
            'reporter_user_id' => Auth::guard('sanctum')->id(),
            'claimant_name'    => $data['claimant_name'],
            'claimant_email'   => $data['claimant_email'],
            'details'          => $data['details'],
        ]);

        if ($to = config('legal.email')) {
            try {
                Mail::raw("New copyright claim #{$claim->id}\nFrom: {$claim->claimant_name} <{$claim->claimant_email}>\nSound: {$claim->sound_id} | Video: {$claim->video_id}\n\n{$claim->details}\n\nAction: php artisan copyright:takedown --claim={$claim->id}", fn ($m) => $m->to($to)->subject("Copyright claim #{$claim->id}"));
            } catch (\Throwable $e) {
                Log::warning('Copyright claim email failed', ['claim' => $claim->id, 'error' => $e->getMessage()]);
            }
        }
        Log::warning('Copyright claim received', ['claim' => $claim->id, 'sound' => $claim->sound_id, 'video' => $claim->video_id]);

        return response()->json(['message' => 'Thank you. We will review this and act quickly.'], 201);
    }
}
