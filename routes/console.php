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

Schedule::command('model:prune', ['--model' => 'App\\Models\\VideoView'])
    ->weekly();

Schedule::command('auth:clear-resets')->weekly();