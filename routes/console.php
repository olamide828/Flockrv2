<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\LoginHistory;

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

Schedule::command('flockr:send-rating-reminders')
    ->hourly()
    ->withoutOverlapping();

Schedule::command('model:prune', ['--model' => 'App\\Models\\VideoView'])
    ->weekly();

Schedule::command('auth:clear-resets')->weekly();

// Purge login history 
Schedule::call(function () {
    LoginHistory::where('created_at', '<', now()->subDays(90))->delete();
})->daily();

Schedule::command('users:purge-deleted')->daily();

Schedule::command('badges:check')->hourly();

Schedule::command('subscriptions:remind')->dailyAt('09:00');

Schedule::command('orders:release-escrow')->hourly();

Schedule::command('orders:expire-pending')->daily();

Artisan::command('terminal:register-webhook', function() {
    $response = \Illuminate\Support\Facades\Http::withHeaders([
        'Authorization' => 'Bearer ' . config('services.terminal.secret_key'),
        'Content-Type'  => 'application/json',
    ])->post('https://sandbox.terminal.africa/v1/webhooks', [
        'url'    => url('/api/webhooks/terminal'),
        'live'   => false,
        'name'   => 'Flockr Shipment Updates',
        'events' => ['shipment.created','shipment.picked_up','shipment.in_transit','shipment.out_for_delivery','shipment.delivered','shipment.pickup_failed','shipment.delivery_failed','shipment.returned'],
    ])->json();
    $this->info(json_encode($response, JSON_PRETTY_PRINT));
})->purpose('Register Flockr webhook with Terminal Africa');