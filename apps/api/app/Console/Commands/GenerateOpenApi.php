<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Routing\Route as LaravelRoute;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Symfony\Component\Yaml\Yaml;

/**
 * Builds docs/openapi.yaml from the registered routes, so an endpoint cannot ship undocumented:
 * the OpenApiTest fails whenever the committed file is out of date. Run `php artisan openapi:generate`
 * after changing routes.
 */
class GenerateOpenApi extends Command
{
    protected $signature = 'openapi:generate {--path= : Output file (default docs/openapi.yaml at the repo root)}';

    protected $description = 'Regenerate docs/openapi.yaml from the API routes';

    public static function defaultPath(): string
    {
        return dirname(base_path(), 2).'/docs/openapi.yaml';
    }

    /** @return array<string, mixed> */
    public function document(): array
    {
        $paths = [];

        foreach (Route::getRoutes()->getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/v1/')) {
                continue;
            }
            $path = '/'.substr($route->uri(), strlen('api/v1/'));
            foreach (array_diff($route->methods(), ['HEAD']) as $method) {
                $paths[$path][strtolower($method)] = $this->operation($route, $path, $method);
            }
        }

        ksort($paths);

        return [
            'openapi' => '3.1.0',
            'info' => [
                'title' => 'Indian Rounds API',
                'version' => '1.0.0',
                'description' => "REST API for the Indian Rounds website and back office.\n\nGenerated from the route table (`php artisan openapi:generate`): every operation lists its auth, staff permission and rate limit. "
                    .'Request/response schemas are described in the controller validation rules; add `x-` schema detail here as the API is consumed by other clients.',
            ],
            'servers' => [['url' => 'http://localhost:8000/api/v1', 'description' => 'Local'], ['url' => 'https://api.example.com/api/v1', 'description' => 'Production (replace)']],
            'components' => [
                'securitySchemes' => ['bearer' => ['type' => 'http', 'scheme' => 'bearer', 'description' => 'Laravel Sanctum personal access token. Staff tokens carry the `staff` ability and expire after 12 hours; customer tokens after 30 days.']],
                'responses' => [
                    'Unauthenticated' => ['description' => 'Missing, expired or invalid token'],
                    'Forbidden' => ['description' => 'Authenticated but lacking the required staff permission'],
                    'ValidationError' => ['description' => 'Validation failed; body is {message, errors: {field: [messages]}}'],
                    'TooManyRequests' => ['description' => 'Rate limit exceeded; see Retry-After'],
                ],
            ],
            'paths' => $paths,
        ];
    }

    /** @return array<string, mixed> */
    private function operation(LaravelRoute $route, string $path, string $method): array
    {
        $middleware = $route->gatherMiddleware();
        $strings = array_values(array_filter($middleware, 'is_string'));
        $authed = in_array('auth:sanctum', $strings, true);
        $staff = in_array('staff', $strings, true);
        $permission = collect($strings)->first(fn ($m) => str_starts_with($m, 'permission:'));
        $throttle = collect($strings)->first(fn ($m) => str_starts_with($m, 'throttle:'));
        $write = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);

        $op = [
            'summary' => $this->summary($route, $method),
            'tags' => [$this->tag($path)],
            'operationId' => $this->operationId($route, $method, $path),
        ];

        preg_match_all('/\{(\w+)\}/', $path, $m);
        if ($m[1] !== []) {
            $op['parameters'] = array_map(fn ($p) => ['name' => $p, 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string']], $m[1]);
        }

        if ($authed) {
            $op['security'] = [['bearer' => []]];
        }
        if ($staff) {
            $op['x-staff-only'] = true;
        }
        if ($permission) {
            $op['x-permission'] = explode('|', substr($permission, strlen('permission:')));
        }
        if ($throttle) {
            [$attempts, $minutes] = array_pad(explode(',', substr($throttle, strlen('throttle:'))), 2, '1');
            $op['x-rate-limit'] = "{$attempts} requests per {$minutes} minute(s) per client";
        }
        if ($route->uri() === 'api/v1/webhooks/razorpay') {
            $op['description'] = 'Razorpay webhook. Authenticated by the X-Razorpay-Signature header (HMAC-SHA256 of the raw body); processing is idempotent on the event id.';
        }

        if ($write) {
            $op['requestBody'] = ['content' => [$this->isUpload($route) ? 'multipart/form-data' : 'application/json' => ['schema' => ['type' => 'object']]]];
        }

        $responses = ['200' => ['description' => 'OK']];
        if ($method === 'POST') {
            $responses['201'] = ['description' => 'Created (where a resource is created)'];
        }
        if ($authed) {
            $responses['401'] = ['$ref' => '#/components/responses/Unauthenticated'];
        }
        if ($staff || $permission) {
            $responses['403'] = ['$ref' => '#/components/responses/Forbidden'];
        }
        if ($write || $route->uri() === 'api/v1/posts' || $route->uri() === 'api/v1/tours') {
            $responses['422'] = ['$ref' => '#/components/responses/ValidationError'];
        }
        if ($throttle) {
            $responses['429'] = ['$ref' => '#/components/responses/TooManyRequests'];
        }
        $op['responses'] = $responses;

        return $op;
    }

    private function isUpload(LaravelRoute $route): bool
    {
        return $route->uri() === 'api/v1/careers/apply';
    }

    private function tag(string $path): string
    {
        $segments = explode('/', trim($path, '/'));
        if ($segments[0] === 'admin') {
            return 'Admin: '.($segments[1] ?? 'general');
        }

        return Str::headline($segments[0]);
    }

    private function summary(LaravelRoute $route, string $method): string
    {
        $action = $route->getActionName();
        if ($action === 'Closure') {
            return Str::headline(Str::afterLast($route->uri(), '/'));
        }
        $class = Str::of(class_basename(Str::before($action, '@')))->replace('Controller', '')->headline();
        $fn = Str::contains($action, '@') ? Str::headline(Str::after($action, '@')) : $method;

        return trim("{$class}: {$fn}");
    }

    private function operationId(LaravelRoute $route, string $method, string $path): string
    {
        return Str::camel(strtolower($method).' '.str_replace(['{', '}', '/', '-'], [' ', ' ', ' ', ' '], $path));
    }

    public function handle(): int
    {
        $file = $this->option('path') ?: self::defaultPath();
        file_put_contents($file, $this->render());
        $this->info('Wrote '.$file);

        return self::SUCCESS;
    }

    public function render(): string
    {
        $yaml = Yaml::dump($this->document(), 12, 2, Yaml::DUMP_MULTI_LINE_LITERAL_BLOCK);

        // OpenAPI response codes are strings; PHP turns "200" keys into integers, so quote them again.
        $yaml = (string) preg_replace('/^(\s+)(\d{3}):$/m', "$1'$2':", $yaml);

        return "# Generated by `php artisan openapi:generate` from the route table. Do not edit by hand.\n".$yaml;
    }
}
