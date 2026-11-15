<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;

/**
 * php artisan flockr:smoke
 *
 * Calls every read-only (GET) admin API endpoint as an admin and prints any that fail, with the real reason.
 * It only READS — nothing is changed. Also checks that the page routes the app redirects to really exist.
 */
class SmokeTest extends Command
{
    protected $signature = 'flockr:smoke {--admin= : id of the admin user to act as (default: first admin)}';
    protected $description = 'Hit every admin GET endpoint and report the ones that error';

    public function handle(): int
    {
        $admin = $this->option('admin') ? User::find($this->option('admin')) : User::where('role', 'admin')->orderBy('id')->first();
        if (!$admin) { $this->error('No admin user found.'); return self::FAILURE; }
        $this->info("Acting as admin #{$admin->id} ({$admin->email})\n");

        $bad = 0;

        // 1) Named routes the app relies on
        foreach (['admin.dashboard', 'seller.dashboard', 'seller.orders', 'seller.products', 'seller.payouts', 'seller.videos', 'upload'] as $name) {
            if (Route::has($name)) { $this->line("  ok    route {$name}"); }
            else { $bad++; $this->error("  FAIL  route {$name} is not defined"); }
        }

        // 2) Every GET admin API endpoint that has no {parameters}
        $kernel = app(Kernel::class);
        foreach (Route::getRoutes() as $route) {
            if (!in_array('GET', $route->methods(), true)) continue;
            $uri = $route->uri();
            if (!str_starts_with($uri, 'api/admin/') || str_contains($uri, '{')) continue;

            Sanctum::actingAs($admin, ['*']);
            try {
                $res = $kernel->handle(Request::create('/' . $uri, 'GET', [], [], [], ['HTTP_ACCEPT' => 'application/json']));
                $code = $res->getStatusCode();
                if ($code >= 500) {
                    $bad++;
                    $why = $res->exception?->getMessage() ?? mb_substr((string) $res->getContent(), 0, 200);
                    $this->error("  FAIL  /{$uri}  [{$code}]  " . mb_substr($why, 0, 220));
                } else {
                    $this->line("  ok    /{$uri}  [{$code}]");
                }
            } catch (\Throwable $e) {
                $bad++;
                $this->error("  FAIL  /{$uri}  " . mb_substr($e->getMessage(), 0, 220));
            }
        }

        $this->newLine();
        $bad === 0 ? $this->info('All good.') : $this->error("{$bad} problem(s) found — send me the FAIL lines.");
        return $bad === 0 ? self::SUCCESS : self::FAILURE;
    }
}
