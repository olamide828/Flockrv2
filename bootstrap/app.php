<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web:      __DIR__ . '/../routes/web.php',
        api:      __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health:   '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->redirectGuestsTo('/login'); 

        // Inertia middleware — must be in web group
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        $middleware->statefulApi();

        // Named middleware aliases
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);

        // Trust Cloudflare / load balancer headers
        $middleware->trustProxies(headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO
        );
    })
     ->withExceptions(function (Exceptions $exceptions) {

        $exceptions->render(function (
            \Symfony\Component\HttpKernel\Exception\HttpException $e,
            $request
        ) {

            if ($e->getStatusCode() === 403) {

                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'Unauthorized.',
                    ], 403);
                }

                if ($request->inertia()) {
                    return \Inertia\Inertia::render('Error', [
                        'status'  => 403,
                        'message' => 'You do not have access to that page.',
                    ])->toResponse($request)->setStatusCode(403);
                }

                return redirect('/')
                    ->with('error', 'You do not have access to that page.');
            }

            if ($request->inertia()) {
                return \Inertia\Inertia::render('Error', [
                    'status'  => $e->getStatusCode(),
                    'message' => $e->getMessage() ?: 'An error occurred.',
                ])->toResponse($request)->setStatusCode($e->getStatusCode());
            }
        });

    })
    ->create();
