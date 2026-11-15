<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/** Read-only view of every wallet movement. Nothing here can change a balance. */
class LedgerController extends Controller
{
    private function filtered(Request $request): Builder
    {
        $q = WalletTransaction::query()->with(['user:id,name,username,avatar', 'order:id,reference']);

        if ($request->filled('type') && $request->type !== 'all')     $q->where('type', $request->type);
        if ($request->filled('source') && $request->source !== 'all') $q->where('source', $request->source);
        if ($request->filled('user_id')) $q->where('user_id', (int) $request->user_id);
        if ($request->filled('from')) $q->whereDate('created_at', '>=', $request->from);
        if ($request->filled('to'))   $q->whereDate('created_at', '<=', $request->to);

        if ($request->filled('search')) {
            $s = trim($request->search);
            $q->where(function ($w) use ($s) {
                $w->where('description', 'ilike', "%{$s}%")
                  ->orWhereHas('user', fn ($u) => $u->where('name', 'ilike', "%{$s}%")->orWhere('username', 'ilike', "%{$s}%")->orWhere('email', 'ilike', "%{$s}%"))
                  ->orWhereHas('order', fn ($o) => $o->where('reference', 'ilike', "%{$s}%"));
            });
        }
        return $q;
    }

    /** GET /api/admin/ledger */
    public function index(Request $request): JsonResponse
    {
        $base = $this->filtered($request);
        $credits = (float) (clone $base)->where('type', 'credit')->sum('amount');
        $debits  = (float) (clone $base)->where('type', 'debit')->sum('amount');

        // What Flockr currently owes sellers: sum of every wallet's latest balance.
        $liability = (float) DB::table('wallet_transactions')
            ->whereIn('id', fn ($s) => $s->from('wallet_transactions')->selectRaw('MAX(id)')->groupBy('user_id'))
            ->sum('balance_after');

        return response()->json([
            'rows'    => $base->orderByDesc('id')->paginate(40)->withQueryString(),
            'totals'  => ['credits' => $credits, 'debits' => $debits, 'net' => $credits - $debits, 'wallet_liability' => $liability],
            'sources' => WalletTransaction::query()->distinct()->orderBy('source')->pluck('source'),
        ]);
    }

    /** GET /api/admin/ledger/export — CSV of the current filters (max 20,000 rows). */
    public function export(Request $request)
    {
        $q = $this->filtered($request)->orderByDesc('id')->limit(20000);

        return response()->streamDownload(function () use ($q) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'date', 'user', 'type', 'amount', 'source', 'order', 'description', 'balance_after']);
            $q->chunk(1000, function ($rows) use ($out) {
                foreach ($rows as $t) {
                    fputcsv($out, [$t->id, $t->created_at, $t->user?->username ?? $t->user_id, $t->type, $t->amount, $t->source, $t->order?->reference, $t->description, $t->balance_after]);
                }
            });
            fclose($out);
        }, 'flockr-ledger-' . now()->format('Ymd-His') . '.csv', ['Content-Type' => 'text/csv']);
    }
}
