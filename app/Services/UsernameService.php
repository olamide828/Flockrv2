<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

class UsernameService
{
    public const MAX = 15;
    public const MIN = 3;
    public const RESERVED = ['admin', 'administrator', 'flockr', 'support', 'help', 'staff', 'official', 'chirp', 'root', 'system', 'moderator', 'mod', 'api', 'login', 'register', 'null', 'undefined'];

    public static function clean(string $v): string
    {
        return substr(preg_replace('/[^a-z0-9_.]/', '', strtolower(trim($v))), 0, self::MAX);
    }

    public static function taken(string $u): bool
    {
        return in_array($u, self::RESERVED, true) || User::withTrashed()->where('username', $u)->exists();
    }

    /** Up to $n free usernames (<=15 chars) built from what the person typed and/or their name. */
    public function suggest(string $username, string $name = '', int $n = 3): array
    {
        $bases = array_values(array_unique(array_filter([
            self::clean($username),
            self::clean(Str::slug($name, '_')),
            self::clean(str_replace(' ', '', strtolower($name))),
        ], fn ($b) => strlen($b) >= 2)));
        if (!$bases) $bases = ['flockr_user'];

        $out = [];
        $tries = 0;
        while (count($out) < $n && $tries < 60) {
            $tries++;
            $base = $bases[$tries % count($bases)];
            $suffix = (string) random_int(1, $tries > 30 ? 9999 : 99);
            $c = substr($base, 0, self::MAX - strlen($suffix)) . $suffix;
            if (strlen($c) >= self::MIN && !in_array($c, $out, true) && !self::taken($c)) $out[] = $c;
        }
        return $out;
    }
}
