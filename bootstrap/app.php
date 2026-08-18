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

        $middleware->web(append: [
            HandleInertiaRequests::class,
            \App\Http\Middleware\EnsureAccountActive::class,
        ]);

        $middleware->statefulApi();

        $middleware->alias([
        'role'   => RoleMiddleware::class,
        ]);


        $middleware->trustProxies(headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO
        );
    })
    ->withExceptions(function (Exceptions $exceptions) {

        // ── ModelNotFoundException: deleted/missing products, videos, users ──
        $exceptions->render(function (
            \Illuminate\Database\Eloquent\ModelNotFoundException $e,
            $request
        ) {
            // Leave API routes alone — they return JSON 404s naturally
            if ($request->expectsJson()) return null;

            $model = $e->getModel();

            if ($model === \App\Models\Product::class) {
                return \Inertia\Inertia::render('Errors/ProductGone', [
                    'categoryName' => null,
                    'categoryId'   => null,
                ])->toResponse($request)->setStatusCode(404);
            }

            if ($model === \App\Models\Video::class) {
                return \Inertia\Inertia::render('Errors/VideoGone', [
                    'deletedVideo' => [],
                    'alternatives' => [],
                    'categoryHint' => null,
                ])->toResponse($request)->setStatusCode(404);
            }

            if ($model === \App\Models\User::class) {
                return \Inertia\Inertia::render('Errors/UserGone')
                    ->toResponse($request)
                    ->setStatusCode(404);
            }

            // Everything else falls through to the standard 404
            return null;
        });

        // ── HttpException: 403, 404, 500, etc. (your existing handler) ───────
        $exceptions->render(function (
            \Symfony\Component\HttpKernel\Exception\HttpException $e,
            $request
        ) {
            if ($e->getStatusCode() === 403) {
                if ($request->expectsJson()) {
                    return response()->json(['message' => 'Unauthorized.'], 403);
                }

                if ($request->inertia()) {
                    return \Inertia\Inertia::render('Error', [
                        'status'  => 403,
                        'message' => 'You do not have access to that page.',
                    ])->toResponse($request)->setStatusCode(403);
                }

                return redirect('/')->with('error', 'You do not have access to that page.');
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