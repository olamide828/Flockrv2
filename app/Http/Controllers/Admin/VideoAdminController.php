<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Video;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VideoAdminController extends Controller
{
    /** GET /api/admin/videos?status=&search=&featured=&page= */
    public function index(Request $request): JsonResponse
    {
        $q = Video::withTrashed()->with('user:id,name,username,avatar')->withCount(['likes', 'comments']);

        $status = $request->input('status');
        if ($status === 'deleted')      $q->onlyTrashed();
        elseif ($status)                $q->withoutTrashed()->where('status', $status);
        else                            $q->withoutTrashed();

        if ($request->boolean('featured')) $q->where('is_featured', true);

        if ($s = trim((string) $request->input('search'))) {
            $q->where(fn ($w) => $w->where('title', 'ilike', "%{$s}%")
                ->orWhere('ulid', $s)
                ->orWhereHas('user', fn ($u) => $u->where('username', 'ilike', "%{$s}%")->orWhere('name', 'ilike', "%{$s}%")));
        }

        $rows = $q->latest()->paginate(24)->through(fn (Video $v) => [
            'id'            => $v->id,
            'ulid'          => $v->ulid,
            'title'         => $v->title,
            'status'        => $v->trashed() ? 'deleted' : $v->status,
            'is_featured'   => (bool) ($v->is_featured ?? false),
            'thumbnail'     => $v->thumbnail_url_full ?? $v->thumbnail_url,
            'video_url'     => $v->video_stream_url ?? $v->video_url,
            'duration'      => $v->duration_seconds,
            'views'         => $v->views_count ?? null,
            'likes_count'   => $v->likes_count,
            'comments_count'=> $v->comments_count,
            'published_at'  => $v->published_at,
            'created_at'    => $v->created_at,
            'user'          => $v->user ? ['id' => $v->user->id, 'name' => $v->user->name, 'username' => $v->user->username, 'avatar' => $v->user->avatar_url ?? null] : null,
            'watch_url'     => $v->user ? "/@{$v->user->username}/video/{$v->ulid}" : null,
        ]);

        $counts = Video::withoutTrashed()->selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');
        $counts['deleted'] = Video::onlyTrashed()->count();

        return response()->json(['rows' => $rows, 'counts' => $counts]);
    }

    /** POST /api/admin/videos/{id}/moderate  {action: approve|reject|hide|restore|feature|unfeature, reason?} */
    public function moderate(Request $request, int $id): JsonResponse
    {
        $data  = $request->validate([
            'action' => 'required|in:approve,reject,hide,restore,feature,unfeature',
            'reason' => 'nullable|string|max:500',
        ]);
        if (in_array($data['action'], ['reject', 'hide']) && blank($data['reason'] ?? null)) {
            return response()->json(['message' => 'A reason is required.'], 422);
        }

        $video = Video::withTrashed()->findOrFail($id);
        if ($video->trashed()) $video->restore();

        match ($data['action']) {
            'approve', 'restore' => $video->update(['status' => 'active', 'published_at' => $video->published_at ?? now()]),
            'reject', 'hide'     => $video->update(['status' => 'archived']),
            'feature'            => $video->forceFill(['is_featured' => true])->save(),
            'unfeature'          => $video->forceFill(['is_featured' => false])->save(),
        };

        Audit::log('video.' . $data['action'], $video, ['title' => $video->title, 'reason' => $data['reason'] ?? null]);
        return response()->json(['message' => 'Done.', 'status' => $video->status]);
    }

    /** DELETE /api/admin/videos/{id}  (soft delete) */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $video = Video::findOrFail($id);
        $video->delete();
        Audit::log('video.delete', $video, ['title' => $video->title, 'reason' => $request->reason]);
        return response()->json(['message' => 'Video deleted.']);
    }
}
