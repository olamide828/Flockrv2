<?php

namespace App\Support;

use Carbon\Carbon;

/** Turns a courier's delivery promise into a date the buyer can see. */
class Eta
{
    /**
     * @param string|null $date  e.g. "Tue, 25 Nov 2026" or an ISO date (courier's own estimate)
     * @param string|null $text  e.g. "2-5 days", "within 3 days"
     * @return array{estimated_delivery: ?Carbon, eta_text: ?string}
     */
    public static function from(?string $date, ?string $text): array
    {
        $at = null;
        if ($date) {
            try { $at = Carbon::parse($date)->endOfDay(); } catch (\Throwable) {}
        }
        $text = $text ? mb_substr(trim($text), 0, 80) : null;

        // No exact date: use the longest number of days the courier promised ("2-5 days" -> 5)
        if (!$at && $text && preg_match_all('/\d+/', $text, $m) && !empty($m[0])) {
            $days = min(30, (int) max($m[0]));
            if ($days > 0) $at = now()->addWeekdays($days)->endOfDay();
        }
        // A date in the past is a courier glitch, never promise it to a buyer
        if ($at && $at->isPast()) $at = null;

        return ['estimated_delivery' => $at, 'eta_text' => $text];
    }
}
