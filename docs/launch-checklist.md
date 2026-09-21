# Launch checklist

Work top to bottom. Each item is either **[client]** (needs a decision, account or asset only the business can supply), **[ops]** (server/DNS work) or **[auto]** (checked by a command or CI). Nothing here is done by code alone: the gate is that every box is ticked and `php artisan launch:check` passes on production.

## 1. Inputs still needed from the client

- [ ] **[client]** Legal entity name, registered address, GST number, PAN, customer-care phone and email. These replace the placeholders in `apps/web/src/lib/site.ts` and the invoice/footers.
- [ ] **[client]** Final Terms, Privacy, Disclaimer and Cancellation text, reviewed by counsel. The cancellation tiers and instalment percentages in `apps/api/config/booking.php` were modelled on a reference site; the business must confirm them as its **own** policy before launch.
- [ ] **[client]** Decide the cancellation outcome: `CANCELLATION_MODE=credit_note` (default) or `refund`.
- [ ] **[client]** Razorpay account with completed KYC and **live** keys (see section 3).
- [ ] **[client]** Google Cloud OAuth client (production redirect URI) if Google sign-in is offered.
- [ ] **[client]** Domain, hosting target, and an email provider (SMTP/API) with SPF, DKIM and DMARC set up for the sending domain.
- [ ] **[client]** Launch catalogue: real tours, itineraries, prices, batches and photographs. The seeded sample data (`CatalogueSeeder`, `GrowthSeeder`) is placeholder and must not go live.
- [ ] **[client]** Real testimonials with permission, real case studies with client consent, real job openings, and the vector logo (the JPEG has a baked-in red background).
- [ ] **[client]** Old-site URL list, if replacing an existing site (section 6).

## 2. Environment (production)

Copy `apps/api/.env.example` and `apps/web/.env.example` and set at least:

| Variable | Value |
| --- | --- |
| `APP_ENV` / `APP_DEBUG` | `production` / `false` |
| `APP_URL`, `FRONTEND_URL` | `https://api.<domain>`, `https://<domain>` (both https) |
| `DB_*` | Managed PostgreSQL 15+; a dedicated least-privilege role |
| `CACHE_STORE`, `QUEUE_CONNECTION`, `SESSION_DRIVER` | `redis` |
| `PAYMENT_DRIVER` | `razorpay` (the fake gateway refuses to boot in production) |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` | live values |
| `MAIL_*`, `MAIL_FROM_ADDRESS` | real provider and a real from-address |
| `COMPANY_GST_STATE` | the state the company is registered in (decides CGST+SGST vs IGST) |
| `TRUSTED_PROXIES` | the load balancer / web-server IPs (needed for correct rate limits and audit IPs) |
| `LOG_STACK` / `LOG_LEVEL` | `daily` / `warning` |
| Web: `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` | the production URLs |
| Web: `NEXT_PUBLIC_IMAGE_HOSTS` | comma-separated hostnames of the image CDN, so photos are resized and served as AVIF/WebP |

- [ ] **[ops]** Secrets live in the host's secret store, never in git. Rotate anything that was ever pasted into chat, tickets or a screenshot.
- [ ] **[ops]** TLS on both hostnames; HTTP redirects to HTTPS; HSTS is sent by the apps in production.
- [ ] **[ops]** The Next.js server sits behind the load balancer, which **overwrites** `X-Forwarded-For` (do not expose the Node port directly, or clients can spoof their IP).

## 3. Razorpay go-live

1. [ ] Complete KYC and activate the account; generate **live** key id and secret.
2. [ ] Dashboard > Webhooks: add `https://api.<domain>/api/v1/webhooks/razorpay`, subscribe to **`payment.captured`** (the only event the API acts on), and set a strong secret = `RAZORPAY_WEBHOOK_SECRET`.
3. [ ] Deploy with the live keys. Run `php artisan launch:check`.
4. [ ] Make one real booking of the smallest instalment with a real card, confirm: booking turns *confirmed*, the email arrives, the invoice shows the right GST split, the payment appears in Razorpay and in Admin > Payments.
5. [ ] Refund that payment from the Razorpay dashboard and, if the business handles it in-app, reconcile in Admin > Refunds. Then cancel the test booking and delete it via a Super Admin database task (there is no delete button by design).
6. [ ] Verify the webhook: Razorpay dashboard > Webhooks > recent deliveries show `200`. Failed deliveries retry automatically; the handler is idempotent on the event id.

## 4. Data and accounts

- [ ] **[ops]** `php artisan migrate --force`, then `php artisan db:seed --class=RbacSeeder --force` (roles and permissions). **Do not** run `DatabaseSeeder` in production.
- [ ] **[ops]** `php artisan admin:create-super-admin owner@company.com "Owner Name"`; the owner sets a password from the emailed link. Then add staff from Admin > Team.
- [ ] **[auto]** No `*@indianrounds.test` demo accounts exist (`launch:check` fails otherwise).
- [ ] **[ops]** Load the real catalogue through Admin, publish tours (Admin role), and add batches.
- [ ] **[ops]** Scheduler and queue worker running (runbook, section 2). Verify `GET /api/v1/health` reports `scheduler: ok` after two minutes.

## 5. Quality gates (all automated in CI; re-run on the release commit)

- [ ] `pint`, `phpstan` (0 errors), `php artisan test` on Postgres.
- [ ] `pnpm lint`, `tsc`, `pnpm test`, `pnpm build`.
- [ ] `composer audit` and `pnpm audit --prod` clean.
- [ ] Booking concurrency test: exactly *capacity* bookings succeed, no oversell (`load/booking-load.mjs`, run in CI on Postgres). Repeat once against **staging** with production-like data and hardware and record the read latencies.
- [ ] Playwright: purchase flow with the login gate, security headers, redirects, no horizontal scroll at 375/768/1280.
- [ ] axe: no serious or critical WCAG 2.1 A/AA violations on the listed pages at 375 and 1280 px.
- [ ] Lighthouse: SEO >= 95, accessibility >= 90.
- [ ] **[client + team]** UAT completed and signed off (`docs/uat-script.md`), including Razorpay **test-mode** payments, a failed payment, and a webhook-only confirmation.

## 6. Redirects and SEO

- [ ] **[client]** If an old site exists: add every old URL to `apps/web/src/lib/redirects.ts` (permanent 308s). The unit test rejects chains and loops.
- [ ] Page titles/descriptions reviewed for the top tours and destinations; `/sitemap.xml` (rebuilt hourly) and `/robots.txt` reachable.
- [ ] Submit the sitemap in Google Search Console; verify the domain; add analytics (respecting the Privacy page).
- [ ] Social sharing image (Open Graph) supplied by the client.

## 7. Safety net

- [ ] **[ops]** Nightly `scripts/backup.sh` running, with an **off-site** copy (`OFFSITE_CMD`).
- [ ] **[ops]** `scripts/restore-drill.sh` passed on a real dump (proves the backup restores and the money tables reconcile). Repeat quarterly.
- [ ] **[ops]** Uptime monitor on `https://api.<domain>/api/v1/health` (alert on non-200 **or** body `degraded`) and on the home page; alerts go to a person who will actually see them.
- [ ] **[ops]** Error tracking on both apps (e.g. Sentry) or at minimum log shipping with an alert on `ERROR`. Alert on `php artisan queue:failed` count > 0.
- [ ] **[ops]** Rollback rehearsed: previous release artefact kept, migrations are backward compatible for one release, and `docs/runbook.md` "Rollback" has been followed once on staging.
- [ ] **[ops]** Razorpay dashboard email alerts for failed payments and disputes go to a monitored inbox.

## 8. Launch day

1. Freeze content and code; tag the release.
2. Take a manual backup (`scripts/backup.sh`).
3. Deploy API, run migrations, deploy web, warm the home, tours and top destination pages.
4. `php artisan launch:check --strict` must exit 0.
5. Run the smoke test: home, search, tour, dates, register, checkout, real small payment (section 3.4), account, invoice, admin login, health endpoint.
6. Point DNS / switch traffic. Watch logs, health, Razorpay and the leads inbox for the first hour.
7. Announce only after the first real booking succeeds end to end.

## 9. First two weeks

- Review failed jobs, 5xx rate, slow queries, and abandoned reservations daily.
- Reconcile Razorpay settlements against Admin > Payments weekly.
- Book a penetration test by an independent party (recommended before large marketing spend; see `docs/security-review.md`).
