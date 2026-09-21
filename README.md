# Indian Rounds

Travel platform: Next.js (`apps/web`) + Laravel 12 REST API (`apps/api`), PostgreSQL, Redis, Razorpay.
Development plan and requirements live in Claude Docs; the API contract is in `docs/openapi.yaml`.

## Prerequisites
Node 24, pnpm 12, PHP 8.3+, Composer 2, Docker Desktop.

## Run locally
```bash
docker compose up -d            # Postgres :5432, Redis :6379, Mailpit :8025

cd apps/api
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve               # http://localhost:8000/api/v1/health

cd apps/web
pnpm install
pnpm dev                        # http://localhost:3000 (style guide at /style-guide)
```

## Checks
- Web: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`
- API: `vendor/bin/pint --test`, `vendor/bin/phpstan analyse`, `php artisan test`

## Layout
- `apps/web` customer site + `/admin` area
- `apps/api` REST API, queues, scheduler
- `packages/api-client` generated TypeScript client (Phase 1+)
- `assets/brand` logo and brand assets
