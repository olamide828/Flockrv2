<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Register Flockr's webhook URL with Terminal Africa.
 *
 * Usage:
 *   php artisan terminal:register-webhook
 *   php artisan terminal:register-webhook --live   (for production)
 */
class RegisterTerminalWebhook extends Command
{
    protected $signature   = 'terminal:register-webhook {--live : Use live API instead of sandbox}';
    protected $description = 'Register Flockr webhook URL with Terminal Africa';

    public function handle(): int
    {
        $secretKey = config('services.terminal.secret_key');
        $baseUrl   = config('services.terminal.base_url', 'https://sandbox.terminal.africa/v1');

        if (!$secretKey) {
            $this->error('TERMINAL_SECRET_KEY is not set in .env');
            return 1;
        }

        // Your webhook endpoint
        $webhookUrl = url('/api/webhooks/terminal');

        $this->info("Registering webhook: {$webhookUrl}");
        $this->info("Using API: {$baseUrl}");

        // First, list existing webhooks
        $listResponse = Http::withHeaders([
            'Authorization' => "Bearer {$secretKey}",
        ])->get("{$baseUrl}/webhooks");

        if ($listResponse->successful()) {
            $existing = $listResponse->json('data') ?? [];
            $this->info('Existing webhooks: ' . count($existing));

            foreach ($existing as $wh) {
                $this->line("  - {$wh['url']} (active: " . ($wh['active'] ? 'yes' : 'no') . ")");
            }
        }

        // Register new webhook
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$secretKey}",
            'Content-Type'  => 'application/json',
        ])->post("{$baseUrl}/webhooks", [
            'url'    => $webhookUrl,
            'active' => true,
            'events' => [
                'shipment.pickup_scheduled',
                'shipment.picked_up',
                'shipment.in_transit',
                'shipment.out_for_delivery',
                'shipment.delivered',
                'shipment.pickup_failed',
                'shipment.delivery_failed',
                'shipment.returned',
            ],
        ]);

        $this->line('Response: ' . $response->body());

        if ($response->successful()) {
            $data   = $response->json('data') ?? [];
            $secret = $data['secret'] ?? null;

            $this->info('✅ Webhook registered successfully!');

            if ($secret) {
                $this->newLine();
                $this->warn('⚠️  Add this to your .env:');
                $this->line("TERMINAL_WEBHOOK_SECRET={$secret}");
                $this->newLine();
                $this->info('Then run: php artisan config:clear');
            } else {
                $this->warn('No secret returned — check Terminal dashboard for webhook secret.');
            }
        } else {
            $this->error('❌ Failed to register webhook');
            $this->line($response->body());
            return 1;
        }

        return 0;
    }
}