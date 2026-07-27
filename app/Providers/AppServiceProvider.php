<?php

namespace App\Providers;

use App\Services\FeedService;
use App\Services\JinaService;
use App\Services\OpenAIService;
use App\Services\PaystackService;
use App\Services\StorageService;
use App\Services\WhisperService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use App\Models\User;
use App\Observers\UserObserver;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Register AI + service classes as singletons
        $this->app->singleton(OpenAIService::class);
        $this->app->singleton(JinaService::class);
        $this->app->singleton(StorageService::class);
        $this->app->singleton(PaystackService::class);

        // WhisperService depends on OpenAIService
        $this->app->singleton(WhisperService::class, fn ($app) =>
            new WhisperService($app->make(OpenAIService::class))
        );

        // FeedService depends on JinaService
        $this->app->singleton(FeedService::class, fn ($app) =>
            new FeedService($app->make(JinaService::class))
        );
    }

    public function boot(): void
    {
        // Strict mode in local — catches N+1, lazy loads, stale models
        Model::shouldBeStrict(! $this->app->isProduction());

        // Don't wrap paginated JSON in a "data" key by default
        JsonResource::withoutWrapping();

        // Log slow queries (>500ms) in production for optimisation
        if ($this->app->isProduction()) {
            DB::listen(function ($query) {
                if ($query->time > 500) {
                    Log::warning('Slow query detected', [
                        'sql'      => $query->sql,
                        'bindings' => $query->bindings,
                        'time_ms'  => $query->time,
                    ]);
                }
            });
        }

          User::observe(UserObserver::class);

        
    }
}
