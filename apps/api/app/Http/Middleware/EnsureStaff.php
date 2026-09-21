<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin routes need a staff account AND a token issued with the `staff` ability, so a
 * customer session can never reach them even if the account were later made staff.
 */
class EnsureStaff
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isStaff() || ! $user->tokenCan('staff')) {
            return response()->json(['message' => 'Staff access required.'], 403);
        }

        return $next($request);
    }
}
