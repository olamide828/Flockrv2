<?php

namespace App\Support;

use Illuminate\Notifications\Notification;

/**
 * Anti-spam for toggle actions (like/unlike, follow/unfollow).
 * A given actor can only ever create ONE notification per (type, target) for a recipient.
 * Un-doing the action removes the notification if it is still unread, so a later re-like
 * produces exactly one fresh notification instead of a pile.
 */
class NotifyOnce
{
    public static function send($notifiable, Notification $notification, string $type, array $meta): bool
    {
        if (self::query($notifiable, $type, $meta)->exists()) {
            return false;
        }
        $notifiable->notify($notification);
        return true;
    }

    public static function retract($notifiable, string $type, array $meta): void
    {
        try {
            self::query($notifiable, $type, $meta)->whereNull('read_at')->delete();
        } catch (\Throwable) {}
    }

    private static function query($notifiable, string $type, array $meta)
    {
        $q = $notifiable->notifications()->where('data->type', $type);
        foreach ($meta as $k => $v) {
            $q->where("data->meta->{$k}", (string) $v);
        }
        return $q;
    }
}
