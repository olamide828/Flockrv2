<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/** Admin v2 — support tickets (suspension appeals, verification requests, general). */
class SupportAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = SupportTicket::with('user:id,name,username,email,avatar,is_active,is_verified');
        if ($t = $request->input('type')) $q->where('type', $t);
        if ($s = $request->input('status')) {
            $s === 'open' ? $q->where('status', '!=', 'resolved') : $q->where('status', $s);
        }
        if ($term = trim((string) $request->input('search'))) {
            $like = '%' . $term . '%';
            $q->where(fn ($w) => $w->where('message', 'ilike', $like)->orWhereHas('user', fn ($u) => $u->where('name', 'ilike', $like)->orWhere('username', 'ilike', $like)));
        }
        $rows = $q->latest()->paginate(25);

        return response()->json([
            'rows'  => $rows,
            'stats' => [
                'open'     => SupportTicket::where('status', '!=', 'resolved')->count(),
                'appeals'  => SupportTicket::where('status', '!=', 'resolved')->where('type', 'suspension_appeal')->count(),
                'verify'   => SupportTicket::where('status', '!=', 'resolved')->where('type', 'verification_request')->count(),
                'resolved' => SupportTicket::where('status', 'resolved')->count(),
            ],
            'types' => SupportTicket::query()->distinct()->pluck('type'),
        ]);
    }

    /** outcome=approve runs the side effect (reinstate / verify); outcome=decline only closes the ticket. */
    public function resolve(Request $request, $ticketId): JsonResponse
    {
        $data = $request->validate(['outcome' => 'required|in:approve,decline', 'note' => 'nullable|string|max:1000']);
        $ticket = SupportTicket::with('user')->findOrFail($ticketId);

        $upd = ['status' => 'resolved'];
        foreach (['admin_note' => $data['note'] ?? null, 'resolved_by' => $request->user()->id, 'resolved_at' => now(), 'outcome' => $data['outcome']] as $col => $val) {
            if (Schema::hasColumn('support_tickets', $col)) $upd[$col] = $val;
        }
        $ticket->update($upd);

        if ($data['outcome'] === 'approve' && $ticket->user) {
            if ($ticket->type === 'suspension_appeal') $ticket->user->update(['is_active' => true, 'suspension_reason' => null, 'suspended_at' => null]);
            if ($ticket->type === 'verification_request') $ticket->user->update(['is_verified' => true]);
        }
        Audit::log('ticket.' . $data['outcome'], $ticket, ['type' => $ticket->type, 'note' => $data['note'] ?? null]);
        return response()->json(['message' => $data['outcome'] === 'approve' ? 'Approved and applied.' : 'Closed without changes.']);
    }

    public function reopen($ticketId): JsonResponse
    {
        $ticket = SupportTicket::findOrFail($ticketId);
        $ticket->update(['status' => 'open']);
        Audit::log('ticket.reopen', $ticket);
        return response()->json(['message' => 'Reopened.']);
    }
}
