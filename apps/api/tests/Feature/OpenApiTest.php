<?php

namespace Tests\Feature;

use App\Console\Commands\GenerateOpenApi;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class OpenApiTest extends TestCase
{
    public function test_the_committed_openapi_file_matches_the_routes(): void
    {
        $file = GenerateOpenApi::defaultPath();
        if (! is_file($file)) {
            $this->markTestSkipped('docs/openapi.yaml is not available outside the monorepo.');
        }

        $this->assertSame(
            str_replace("\r\n", "\n", (string) file_get_contents($file)),
            str_replace("\r\n", "\n", (new GenerateOpenApi)->render()),
            'docs/openapi.yaml is out of date. Run: php artisan openapi:generate',
        );
    }

    public function test_every_admin_route_requires_a_staff_token_and_a_permission_except_the_known_exceptions(): void
    {
        // Routes any staff member may call; each scopes or gates its own data in the controller.
        $staffOnly = ['api/v1/admin/dashboard', 'api/v1/admin/approvals'];
        $problems = [];

        foreach (Route::getRoutes()->getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/v1/admin')) {
                continue;
            }
            $mw = array_filter($route->gatherMiddleware(), 'is_string');
            $label = implode('|', $route->methods()).' '.$route->uri();

            if (! in_array('auth:sanctum', $mw, true) || ! in_array('staff', $mw, true)) {
                $problems[] = "{$label} lacks auth:sanctum + staff";
            }
            $hasPermission = collect($mw)->contains(fn ($m) => str_starts_with($m, 'permission:'));
            if (! $hasPermission && ! in_array($route->uri(), $staffOnly, true)) {
                $problems[] = "{$label} has no permission middleware";
            }
        }

        $this->assertSame([], $problems);
    }

    public function test_only_the_intended_write_endpoints_are_public(): void
    {
        $publicWrites = [];
        foreach (Route::getRoutes()->getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/v1/') || str_starts_with($route->uri(), 'api/v1/admin')) {
                continue;
            }
            $mw = array_filter($route->gatherMiddleware(), 'is_string');
            foreach (array_diff($route->methods(), ['GET', 'HEAD']) as $method) {
                if (! in_array('auth:sanctum', $mw, true)) {
                    $publicWrites[] = "{$method} ".substr($route->uri(), 7);
                }
            }
        }
        sort($publicWrites);

        $this->assertSame([
            'POST auth/forgot-password', 'POST auth/google/exchange', 'POST auth/login', 'POST auth/register', 'POST auth/reset-password',
            'POST careers/apply', 'POST leads/callback', 'POST leads/contact', 'POST leads/corporate', 'POST leads/custom', 'POST leads/quote',
            'POST webhooks/razorpay',
        ], $publicWrites);
    }

    public function test_every_public_write_endpoint_is_rate_limited_except_the_signed_webhook(): void
    {
        $unlimited = [];
        foreach (Route::getRoutes()->getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/v1/') || str_starts_with($route->uri(), 'api/v1/admin')) {
                continue;
            }
            $mw = array_filter($route->gatherMiddleware(), 'is_string');
            $isPublicWrite = array_diff($route->methods(), ['GET', 'HEAD']) !== [] && ! in_array('auth:sanctum', $mw, true);
            $throttled = collect($mw)->contains(fn ($m) => str_starts_with($m, 'throttle:'));
            if ($isPublicWrite && ! $throttled) {
                $unlimited[] = $route->uri();
            }
        }

        // The webhook is authenticated by an HMAC signature and must not be throttled (Razorpay retries in bursts).
        $this->assertSame(['api/v1/webhooks/razorpay'], $unlimited);
    }
}
