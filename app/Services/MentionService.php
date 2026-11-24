<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserBlock;
use App\Notifications\MentionNotification;

/** Finds @username tags in text and notifies those people (never yourself, never across a block). */
class MentionService
{
    public const PATTERN = '/(?<![\w@])@([A-Za-z0-9_.]{2,20})/';

    /** @return string[] distinct lowercase usernames, max 10 */
    public function usernames(?string $text): array
    {
        if (!$text || !preg_match_all(self::PATTERN, $text, $m)) return [];
        return collect($m[1])->map(fn ($u) => rtrim(mb_strtolower($u), '.'))->filter()->unique()->take(10)->values()->all();
    }

    /**
     * @param string $where  'comment' | 'video' | 'post' (wording of the notification)
     * @param int[]  $skipUserIds people who already get another notification for this action
     */
    public function notify(?string $text, User $actor, string $where, string $url, array $skipUserIds = []): int
    {
        $names = $this->usernames($text);
        if (!$names) return 0;

        $blocked = UserBlock::where('blocker_id', $actor->id)->pluck('blocked_id')
            ->concat(UserBlock::where('blocked_id', $actor->id)->pluck('blocker_id'))->all();

        $users = User::whereIn(\DB::raw('lower(username)'), $names)
            ->where('is_active', true)
            ->where('id', '!=', $actor->id)
            ->whereNotIn('id', array_merge($blocked, $skipUserIds))
            ->get();

        foreach ($users as $u) {
            try { $u->notify(new MentionNotification($actor, $where, (string) $text, $url)); } catch (\Throwable) {}
        }
        return $users->count();
    }
}
