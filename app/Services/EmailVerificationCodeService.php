<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\VerifyEmailCodeNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/** 6-digit email codes: hashed at rest, 10 minute life, 5 wrong tries, 60 second resend cooldown (enforced here, not by a throttle that throws). */
class EmailVerificationCodeService
{
    public const COOLDOWN = 60;
    public const TTL_MIN = 10;
    public const MAX_ATTEMPTS = 5;

    /** @return array{ok:bool,cooldown:int,message:string} */
    public function send(User $user, bool $force = false): array
    {
        if ($user->hasVerifiedEmail()) {
            return ['ok' => true, 'cooldown' => 0, 'message' => 'Your email is already verified.'];
        }
        $wait = $force ? 0 : $this->cooldownLeft($user);
        if ($wait > 0) {
            return ['ok' => false, 'cooldown' => $wait, 'message' => "Please wait {$wait} seconds before asking for another code."];
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        DB::table('email_verification_codes')->updateOrInsert(
            ['user_id' => $user->id],
            ['code_hash' => Hash::make($code), 'expires_at' => now()->addMinutes(self::TTL_MIN), 'attempts' => 0, 'sent_at' => now(), 'created_at' => now(), 'updated_at' => now()]
        );

        try {
            $user->notify(new VerifyEmailCodeNotification($code, self::TTL_MIN));
        } catch (\Throwable $e) {
            Log::error('Verification code email failed: ' . $e->getMessage());
            return ['ok' => false, 'cooldown' => 10, 'message' => "We couldn't send the email right now. Please try again in a moment."];
        }
        return ['ok' => true, 'cooldown' => self::COOLDOWN, 'message' => 'We sent a 6-digit code to your email.'];
    }

    /** @return array{ok:bool,message:string} */
    public function verify(User $user, string $code): array
    {
        if ($user->hasVerifiedEmail()) return ['ok' => true, 'message' => 'Already verified.'];
        $row = DB::table('email_verification_codes')->where('user_id', $user->id)->first();
        if (!$row || now()->gt($row->expires_at)) {
            return ['ok' => false, 'message' => 'That code has expired. Tap "Resend code" to get a new one.'];
        }
        if ($row->attempts >= self::MAX_ATTEMPTS) {
            return ['ok' => false, 'message' => 'Too many wrong tries. Tap "Resend code" to get a new one.'];
        }
        if (!Hash::check(preg_replace('/\D/', '', $code), $row->code_hash)) {
            DB::table('email_verification_codes')->where('id', $row->id)->increment('attempts');
            $left = max(0, self::MAX_ATTEMPTS - $row->attempts - 1);
            return ['ok' => false, 'message' => $left > 0 ? "That code isn't right. {$left} " . ($left === 1 ? 'try' : 'tries') . ' left.' : 'Too many wrong tries. Tap "Resend code" to get a new one.'];
        }
        $user->forceFill(['email_verified_at' => now()])->save();
        DB::table('email_verification_codes')->where('user_id', $user->id)->delete();
        return ['ok' => true, 'message' => 'Email verified.'];
    }

    public function cooldownLeft(User $user): int
    {
        $row = DB::table('email_verification_codes')->where('user_id', $user->id)->first();
        if (!$row || !$row->sent_at) return 0;
        $end = \Illuminate\Support\Carbon::parse($row->sent_at)->addSeconds(self::COOLDOWN);
        return now()->lt($end) ? (int) ceil(now()->diffInSeconds($end, true)) : 0;
    }
}
