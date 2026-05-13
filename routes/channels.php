<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Scheduled Tasks  (replaces old Kernel.php in Laravel 11)
|--------------------------------------------------------------------------
*/

// Re-generate AI descriptions for products that are stale (>30 days old)
Schedule::command('flockr:refresh-ai-descriptions')
    ->dailyAt('03:00')
    ->withoutOverlapping();

// Compute and cache trending feed (top videos by engagement in last 24h)
Schedule::command('flockr:compute-trending')
    ->hourly()
    ->withoutOverlapping();

// Process pending seller payouts (runs nightly after settlement)
Schedule::command('flockr:process-payouts')
    ->dailyAt('02:00')
    ->withoutOverlapping()
    ->emailOutputOnFailure(config('mail.from.address'));

// Prune old video view records (keep 90 days for analytics)
Schedule::command('model:prune', ['--model' => 'App\\Models\\VideoView'])
    ->weekly();

// Clear expired password reset tokens
Schedule::command('auth:clear-resets')->weekly();

// Telescope pruning (if installed)
// Schedule::command('telescope:prune --hours=48')->daily();
