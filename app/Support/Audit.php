<?php

namespace App\Support;

use App\Models\AdminAuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/** One line per admin action: Audit::log('order.refund', $order, ['reason' => '…']); never throws. */
class Audit
{
    public static function log(string $action, $target = null, array $meta = []): void
    {
        try {
            AdminAuditLog::create([
                'admin_id'    => Auth::id(),
                'action'      => $action,
                'target_type' => $target ? strtolower(class_basename($target)) : null,
                'target_id'   => $target?->getKey(),
                'meta'        => $meta ?: null,
                'ip'          => request()?->ip(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('audit log failed: ' . $e->getMessage());
        }
    }
}
