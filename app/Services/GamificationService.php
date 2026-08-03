<?php

namespace App\Services;

use App\Models\LoginHistory;
use App\Models\Order;
use App\Models\User;

class GamificationService
{
    const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000, 50000];

    public function forSeller(User $seller): array
    {
        $totalVideos        = $seller->videos()->count();
        $totalViewsAllTime  = $seller->videos()->sum('views_count');
        $totalOrdersAllTime = Order::forSeller($seller->id)->paid()->count();

        $xp = (int) round(
            ($totalVideos * 50) + ($totalViewsAllTime * 0.1) + ($totalOrdersAllTime * 100) + ($seller->followers_count * 5)
        );

        [$level, $currentThreshold, $nextThreshold] = $this->levelFromXp($xp);

        $publishDates = $seller->videos()
            ->whereNotNull('published_at')
            ->orderByDesc('published_at')
            ->pluck('published_at')
            ->map(fn ($d) => $d->format('Y-m-d'))
            ->unique()
            ->values();

        $streak = $this->consecutiveDayStreak($publishDates);

        return [
            'level'         => $level,
            'xp'            => $xp,
            'xp_into_level' => $xp - $currentThreshold,
            'xp_for_level'  => max(1, $nextThreshold - $currentThreshold),
            'streak_days'   => $streak,
            'streak_type'   => 'upload',
        ];
    }

    public function forBuyer(User $buyer): array
    {
        $orderCount = Order::where('buyer_id', $buyer->id)->paid()->count();
        $xp = (int) round($orderCount * 80);

        [$level, $currentThreshold, $nextThreshold] = $this->levelFromXp($xp);

        $loginDates = LoginHistory::where('user_id', $buyer->id)
            ->orderByDesc('created_at')
            ->pluck('created_at')
            ->map(fn ($d) => $d->format('Y-m-d'))
            ->unique()
            ->values();

        $streak = $this->consecutiveDayStreak($loginDates);

        return [
            'level'         => $level,
            'xp'            => $xp,
            'xp_into_level' => $xp - $currentThreshold,
            'xp_for_level'  => max(1, $nextThreshold - $currentThreshold),
            'streak_days'   => $streak,
            'streak_type'   => 'visit',
        ];
    }

    private function levelFromXp(int $xp): array
    {
        $level = 1;
        foreach (self::LEVEL_THRESHOLDS as $i => $threshold) {
            if ($xp >= $threshold) $level = $i + 1;
        }
        $currentThreshold = self::LEVEL_THRESHOLDS[$level - 1] ?? 0;
        $nextThreshold    = self::LEVEL_THRESHOLDS[$level] ?? ($currentThreshold * 2);

        return [$level, $currentThreshold, $nextThreshold];
    }

    private function consecutiveDayStreak($dates): int
    {
        $streak = 0;
        $cursor = now()->startOfDay();
        foreach ($dates as $date) {
            if ($date === $cursor->format('Y-m-d')) {
                $streak++;
                $cursor->subDay();
            } else {
                break;
            }
        }
        return $streak;
    }
}