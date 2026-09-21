<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `permission:a|b` — allow when the authenticated user holds any listed permission.
 * (Spatie's own middleware checks the default session guard, which is not used for token auth.)
 */
class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permissions): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasAnyPermission(explode('|', $permissions))) {
            return response()->json(['message' => 'You do not have permission to do that.'], 403);
        }

        return $next($request);
    }
}
