<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): mixed
{
    if (!$request->user() || $request->user()->role !== $role) {
        if ($request->expectsJson()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        // Redirect to home instead of Laravel's 403 page
        return redirect('/')->with('error', 'You do not have access to that page.');
    }
    return $next($request);
}
}
