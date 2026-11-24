<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Admin chat restrictions: ChatRestriction::active($userId, 'dm') returns the live row or null. Never throws. */
class ChatRestriction
{
    public static function active(int $userId, string $scope): ?object
    {
        try {
            if (!Schema::hasTable('chat_restrictions')) return null;
            return DB::table('chat_restrictions')
                ->where('user_id', $userId)->whereNull('lifted_at')
                ->whereIn('scope', ['all', $scope])
                ->where(fn ($q) => $q->whereNull('until')->orWhere('until', '>', now()))
                ->orderByDesc('id')->first();
        } catch (\Throwable) {
            return null;
        }
    }

    public static function message(object $r): string
    {
        $until = $r->until ? ' until ' . \Carbon\Carbon::parse($r->until)->format('j M Y') : '';
        return "Your messaging has been restricted by Flockr{$until}." . ($r->reason ? " Reason: {$r->reason}" : '');
    }
}
