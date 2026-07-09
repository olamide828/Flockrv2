<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ── Scheduled Tasks ───────────────────────────────────────────────────────────

Schedule::command('flockr:refresh-ai-descriptions')
    ->dailyAt('03:00')
    ->withoutOverlapping();

Schedule::command('flockr:compute-trending')
    ->hourly()
    ->withoutOverlapping();

Schedule::command('flockr:process-payouts')
    ->dailyAt('02:00')
    ->withoutOverlapping()
    ->emailOutputOnFailure(config('mail.from.address'));

// Send rating reminders at 24h, 72h, and 7d after delivery
Schedule::command('flockr:send-rating-reminders')
    ->hourly()
    ->withoutOverlapping();

Schedule::command('model:prune', ['--model' => 'App\\Models\\VideoView'])
    ->weekly();

Schedule::command('auth:clear-resets')->weekly();