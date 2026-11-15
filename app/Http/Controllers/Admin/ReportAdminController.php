<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportAdminController extends Controller
{
    /** GET /api/admin/reports?status=&type=video|product|chat|order|user&search=&sort= */
    public function index(Request $request): JsonResponse
    {
        $q = Report::with(['reporter:id,name,username,avatar', 'reported:id,name,username,avatar,role'])->select('reports.*');

        if ($st = $request->input('status')) $q->where('reports.status', $st);

        match ($request->input('type')) {
            'video'   => $q->where('reports.reason', 'like', '[Video:%'),
            'product' => $q->where('reports.reason', 'like', '[Product:%'),
            'chat'    => $q->whereNotNull('reports.conversation_id'),
            'order'   => $q->whereNotNull('reports.order_id'),
            'appeal'  => $q->where('reports.reason', 'like', '[Suspension Appeal]%'),
            'user'    => $q->whereNull('reports.conversation_id')->whereNull('reports.order_id')
                            ->where('reports.reason', 'not like', '[Video:%')->where('reports.reason', 'not like', '[Product:%')
                            ->where('reports.reason', 'not like', '[Suspension Appeal]%'),
            default   => null,
        };

        if ($s = trim((string) $request->input('search'))) {
            $q->where(fn ($w) => $w->where('reports.reason', 'ilike', "%{$s}%")
                ->orWhereHas('reported', fn ($u) => $u->where('username', 'ilike', "%{$s}%"))
                ->orWhereHas('reporter', fn ($u) => $u->where('username', 'ilike', "%{$s}%")));
        }

        match ($request->input('sort')) {
            'oldest' => $q->oldest('reports.updated_at'),
            'count'  => $q->orderByDesc('reports.report_count'),
            default  => $q->latest('reports.updated_at'),
        };

        $rows = $q->paginate(25)->through(function (Report $r) {
            $reason = (string) $r->reason;
            $kind = 'user';
            $ref = null;
            if (preg_match('/^\[Product:\s*([^\]]+)\]\s*(.*)$/s', $reason, $m))      { $kind = 'product'; $ref = trim($m[1]); $reason = $m[2]; }
            elseif (preg_match('/^\[Video:\s*([^\]]+)\]\s*(.*)$/s', $reason, $m))    { $kind = 'video';   $ref = trim($m[1]); $reason = $m[2]; }
            elseif (str_starts_with($reason, '[Suspension Appeal]'))                  { $kind = 'appeal';  $reason = trim(substr($reason, 19)); }
            elseif ($r->conversation_id) $kind = 'chat';
            elseif ($r->order_id)        $kind = 'order';

            return [
                'id'           => $r->id,
                'kind'         => $kind,
                'ref'          => $ref,
                'reason'       => $reason,
                'status'       => $r->status,
                'report_count' => (int) ($r->report_count ?? 1),
                'order_id'     => $r->order_id,
                'conversation_id' => $r->conversation_id,
                'created_at'   => $r->created_at,
                'updated_at'   => $r->updated_at,
                'reporter'     => $r->reporter,
                'reported'     => $r->reported,
            ];
        });

        // Resolve product slugs → ids and names in one query so the UI can link to them
        $slugs = collect($rows->items())->where('kind', 'product')->pluck('ref')->filter()->unique()->all();
        $products = $slugs ? Product::withTrashed()->whereIn('slug', $slugs)->get(['id', 'slug', 'name'])->keyBy('slug') : collect();
        $rows->through(function ($r) use ($products) {
            if ($r['kind'] === 'product' && $r['ref'] && $products->has($r['ref'])) {
                $r['product'] = ['id' => $products[$r['ref']]->id, 'name' => $products[$r['ref']]->name, 'slug' => $r['ref']];
            }
            return $r;
        });

        $counts = Report::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');

        return response()->json(['rows' => $rows, 'counts' => $counts]);
    }

    /** POST /api/admin/reports/{id}/resolve {status: actioned|dismissed|pending, note?, suspend_user?} */
    public function resolve(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:actioned,dismissed,pending',
            'note'   => 'nullable|string|max:500',
        ]);
        $report = Report::findOrFail($id);
        $report->update(['status' => $data['status']]);

        // Same behaviour as the old endpoint: an actioned suspension appeal reactivates the user.
        if ($data['status'] === 'actioned' && str_starts_with((string) $report->reason, '[Suspension Appeal]') && $report->reported_id) {
            User::where('id', $report->reported_id)->update(['is_active' => true, 'suspension_reason' => null, 'suspended_at' => null]);
        }

        Audit::log('report.' . $data['status'], $report, ['note' => $data['note'] ?? null, 'reported_id' => $report->reported_id]);
        return response()->json(['message' => 'Report ' . $data['status'] . '.']);
    }
}
