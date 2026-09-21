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
php artisan migrate --seed      # sample catalogue (non-production only)
php artisan serve               # http://localhost:8000/api/v1/health

cd apps/web
cp .env.example .env.local
pnpm install
pnpm dev                        # http://localhost:3000 (style guide at /style-guide)
```

## Payments and scheduler
- `PAYMENT_DRIVER=fake` (default in dev) simulates payments; the checkout shows a "Simulate payment" button. It is refused in production.
- For Razorpay set `PAYMENT_DRIVER=razorpay`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and add a webhook to `<api>/api/v1/webhooks/razorpay` for `payment.captured`.
- Unpaid bookings release their seats after 15 minutes via `bookings:release-expired`. Run `php artisan schedule:work` locally, or a cron entry `* * * * * php artisan schedule:run` in production.
- `CANCELLATION_MODE=credit_note` (default) issues a credit note for the returnable amount; `refund` records a pending refund for staff. Deduction tiers live in `config/booking.php`. This is a policy decision for the business to confirm.
- `payments:send-reminders` runs daily and emails instalments due within 3 days.
- Set `COMPANY_GST_STATE` to the state the company is registered in; it decides CGST+SGST vs IGST on invoices.

## Admin back office (`/admin`)
- Roles: `super_admin`, plus `<department>.admin` and `<department>.staff` for sales, operations, personalised, corporate, finance, content, customer_success and hr. The permission matrix lives in `apps/api/config/rbac.php` (re-apply with `php artisan db:seed --class=RbacSeeder`); the Roles screen in the admin shows it.
- Local demo accounts (never seeded in production; password `password`): `super@indianrounds.test`, `<department>.admin@indianrounds.test`, `<department>.staff@indianrounds.test`.
- Production: create the first Super Admin with `php artisan admin:create-super-admin you@company.com "Your Name"`; they set a password from the emailed link. Staff are then added from Admin > Team, which also emails a set-password link.
- Staff tokens carry the `staff` ability; customer tokens never do, so a customer session cannot reach `/api/v1/admin/*`.
- Refunds and manual credit notes above the Staff limit (Admin > Settings) wait for an Admin's approval. Every admin change is written to an append-only audit log.

## Content and growth
- **Blog** (`/blog`): posts have a content type (places to visit, things to do, places to eat, places to shop, travel journal, stories, news, general) and an optional destination. Bodies are plain text with light formatting (`##`, `-`, `**bold**`, links) and are rendered without raw HTML. Staff in Content save drafts; only an Admin publishes (`posts.publish`).
- **Landing pages** (`/collections/<slug>`): Weekend Getaways, Events & Festivals, Luxury, Christmas & New Year, Family, Couples. They are defined in `apps/api/config/collections.php`; a tour appears on a page when it carries that page's tag, set on the tour in the admin.
- **Corporate** (`/corporate`) and **Custom trips** (`/custom-trips`) store enquiries as leads (`corporate` / `custom`). Corporate staff only see corporate leads, Personalised staff only see custom ones, Sales staff see callback/quote/contact; Admins and Super Admins see all.
- **Careers** (`/careers`): HR manages openings and applications. Résumés (PDF/DOC/DOCX, 5 MB) are stored on the private disk and only downloadable by HR through an audited endpoint.
- The seeded posts, tours, case studies and jobs (`GrowthSeeder`, non-production only) are placeholders: replace them through the admin before launch.

## Tests use their own database
Create `apps/api/.env.testing` (git-ignored) with `APP_ENV=testing`, `APP_KEY`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, `CACHE_STORE=array`, `SESSION_DRIVER=array`, `QUEUE_CONNECTION=sync` so `php artisan test` never touches your dev database.

## Checks
- Web: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`
- API: `vendor/bin/pint --test`, `vendor/bin/phpstan analyse`, `php artisan test`

## Layout
- `apps/web` customer site + `/admin` area
- `apps/api` REST API, queues, scheduler
- `packages/api-client` generated TypeScript client (Phase 1+)
- `assets/brand` logo and brand assets
