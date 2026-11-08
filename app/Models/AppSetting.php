<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/** Tiny key/value store for admin switches (no deploy needed to flip a feature). */
class AppSetting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get(string $key, $default = null)
    {
        try {
            $all = Cache::remember('app_settings', 300, fn () => static::pluck('value', 'key')->all());
        } catch (\Throwable) {
            return $default;   // table not migrated yet
        }
        return array_key_exists($key, $all) ? json_decode($all[$key], true) : $default;
    }

    public static function set(string $key, $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => json_encode($value)]);
        Cache::forget('app_settings');
    }

    public static function bool(string $key, bool $default = true): bool
    {
        return (bool) static::get($key, $default);
    }
}
