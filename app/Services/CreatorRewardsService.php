<?php

namespace App\Services;

use App\Models\User;

/**
 * Progress toward Flockr Creator Rewards — what the dashboard KPI card shows.
 * The thresholds below are a DRAFT: override them any time with config('flockr.creator_rewards') (same keys),
 * no code change needed. Payouts are not switched on yet; this only measures who is on track.
 */
class CreatorRewardsService
{
    public const DEFAULTS = [
        'followers'    => 1000,    // total followers
        'views_30d'    => 10000,   // views on videos posted in the last 30 days
        'videos_30d'   => 5,       // videos posted in the last 30 days
        'min_age_days' => 30,      // account age
    ];

    public function progress(User $u): array
    {
        $t = array_merge(self::DEFAULTS, (array) config('flockr.creator_rewards', []));
        $since = now()->subDays(30);
        $recent = $u->videos()->where('status', 'active')->where('created_at', '>=', $since);

        $rows = [
            ['key' => 'followers',  'label' => 'Followers',              'value' => (int) $u->followers_count,           'target' => (int) $t['followers']],
            ['key' => 'views',      'label' => 'Views (last 30 days)',   'value' => (int) (clone $recent)->sum('views_count'), 'target' => (int) $t['views_30d']],
            ['key' => 'videos',     'label' => 'Videos (last 30 days)',  'value' => (int) (clone $recent)->count(),      'target' => (int) $t['videos_30d']],
            ['key' => 'age',        'label' => 'Account age (days)',     'value' => (int) $u->created_at?->diffInDays(now()), 'target' => (int) $t['min_age_days']],
        ];
        foreach ($rows as &$r) {
            $r['pct'] = $r['target'] > 0 ? min(100, (int) floor($r['value'] / $r['target'] * 100)) : 100;
            $r['met'] = $r['value'] >= $r['target'];
        }
        $met = collect($rows)->where('met', true)->count();

        return [
            'criteria'  => $rows,
            'met'       => $met,
            'total'     => count($rows),
            'eligible'  => $met === count($rows),
            'overall'   => (int) round(collect($rows)->avg('pct')),
            'live'      => (bool) config('flockr.creator_rewards_live', false),   // flips to true when payouts open
        ];
    }
}
