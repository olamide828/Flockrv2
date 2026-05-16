<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): mixed
    {
        // dd([
        //     'user' => $request->user(),
        //     'user_role' => $request->user()?->role,
        //     'required_role' => $role,
        //     'match' => $request->user()?->role === $role,
        // ]);
        if (!$request->user() || $request->user()->role !== $role) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthorized.'], 403);
            }
            abort(403, 'Access denied.');
        }
        return $next($request);
    }
}
