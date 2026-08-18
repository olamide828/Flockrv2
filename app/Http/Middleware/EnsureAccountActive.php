<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EnsureAccountActive
{
    public function handle(Request $request, Closure $next)
{
    $user = Auth::user();

    if ($user && !$user->is_active && !$request->routeIs('suspended', 'suspended.appeal', 'logout')) {
        return redirect()->route('suspended');
    }

    return $next($request);
}
}