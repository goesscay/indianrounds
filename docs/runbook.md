# Operations runbook

For whoever is on call. Assumes the layout in the README: a Laravel API, a Next.js web app, PostgreSQL, Redis.

## 1. What runs where

| Process | Purpose | If it stops |
| --- | --- | --- |
| PHP-FPM / API web server | REST API | Site cannot load data or take bookings |
| Next.js (`pnpm start`) | Website and same-origin proxy (`/api/backend/*`) | Site is down; pages already cached at the CDN may still serve |
| PostgreSQL | System of record | Everything stops; `/health` returns 503 |
| Redis | Cache, queue, sessions, rate limits | `/health` returns 503 (cache probe fails) |
| **Scheduler** (`php artisan schedule:run` every minute) | Releases expired seat reservations, sends payment reminders, heartbeat, prunes tokens | Seats stay held past 15 min; reminders stop; `/health` becomes `degraded` after 5 min |
| **Queue worker** (`php artisan queue:work redis --tries=5`) | Sends booking/cancellation/reminder emails | Emails pile up; **payments and bookings are unaffected** |

Cron entry: `* * * * * cd /srv/indianrounds/apps/api && php artisan schedule:run >> /dev/null 2>&1`
Worker under a supervisor (systemd/Supervisor) with auto-restart, and restart it on every deploy: `php artisan queue:restart`.

## 2. Health and monitoring

`GET /api/v1/health` (never cached):

```json
{"status":"ok","app":"Indian Rounds","checks":{"database":"ok","cache":"ok","scheduler":"ok"}}
```

- `503 down`: database or cache unreachable. Page immediately.
- `200 degraded`: scheduler heartbeat older than 5 minutes. Page during business hours; if it persists, reservations are not being released.
- `scheduler: unknown`: no heartbeat yet (fresh deploy, cache flushed). Wait two minutes.

Alert on: non-200/`degraded` health, home page 5xx, `php artisan queue:failed` count > 0, Postgres disk > 80%, Redis memory > 80%, certificate expiry < 14 days.

Logs: `apps/api/storage/logs/laravel-*.log` (daily). Every admin change and money movement is also in the append-only **audit log** (Admin > Audit log).

## 3. Deploy

1. `scripts/backup.sh` (manual backup).
2. API: pull, `composer install --no-dev --optimize-autoloader`, `php artisan migrate --force`, `php artisan config:cache route:cache event:cache`, reload PHP-FPM, `php artisan queue:restart`.
3. Web: `pnpm install --frozen-lockfile && pnpm build`, restart the Node process. Public pages revalidate every 60 s (sitemap hourly) so no manual cache purge is needed.
4. `php artisan launch:check` and the smoke test in `docs/launch-checklist.md` section 8.

Migrations must be backward compatible with the previous release for one deploy, so a rollback of code does not need a rollback of schema.

### Manual deploy (when GitHub Actions cannot run, e.g. a billing block)
The pipeline only wraps `scripts/deploy.sh`; the same script can be run from any machine that has the root SSH key. Run the usual checks locally first (the pipeline normally gates on CI): `pnpm lint && pnpm exec tsc --noEmit && pnpm test && pnpm build` in `apps/web`, and `vendor/bin/pint --test && vendor/bin/phpstan analyse && php artisan test` in `apps/api`.
```bash
SHA=$(git rev-parse HEAD); VERSION=v0.1.6   # the tag you are releasing
git archive --format=tar.gz HEAD | ssh -i ~/.ssh/indianrounds_deploy root@200.97.163.126 'cat > /tmp/release.tgz'
tr -d '' < scripts/deploy.sh | ssh -i ~/.ssh/indianrounds_deploy root@200.97.163.126   "cat > /tmp/deploy.sh; chmod 644 /tmp/release.tgz /tmp/deploy.sh; sudo -u deploy env FORCE=1 bash /tmp/deploy.sh /tmp/release.tgz $VERSION $SHA; rm -f /tmp/release.tgz /tmp/deploy.sh"
```
It takes the same database and code backups, migrates, builds, restarts and health-checks, and rolls the code back automatically if the health check fails. Afterwards `head -2 /srv/indianrounds/VERSION` on the server shows the version and commit.

### Rollback
Redeploy the previous artefacts and `php artisan queue:restart`. Only run `php artisan migrate:rollback --step=1` if the release added a migration that the old code cannot tolerate, and only after a backup.

## 4. Backups and restore

- Nightly: `scripts/backup.sh` (Postgres custom-format dump + private uploads, checksums, off-site copy, 30-day local retention).
- Point-in-time recovery (recommended for production): enable WAL archiving / the managed provider's PITR with >= 7 days.
- **Restore drill** (before launch, then quarterly): `scripts/restore-drill.sh <dump>` restores into a scratch database and asserts no confirmed booking lacks a payment and no batch is oversold.
- Real restore: stop the API, restore into a fresh database with `pg_restore --no-owner --dbname=<new> <dump>`, point `DB_DATABASE` at it, `php artisan migrate --force`, start the API, run the smoke test. Restore uploads by extracting the tarball into `apps/api/storage/app/private`.

## 5. Incident playbooks

### A customer paid but the booking is still "pending payment"
1. Find the booking in Admin > Bookings and the payment in the Razorpay dashboard (search by order id).
2. If Razorpay shows **captured**: the webhook did not arrive or failed. Razorpay dashboard > Webhooks > deliveries: redeliver the `payment.captured` event. The handler is idempotent, so redelivery is safe. Then check the booking turned *confirmed*.
3. If Razorpay shows **failed/authorized only**: do not confirm. Ask the customer to retry; the reservation may have expired (15 minutes).
4. If the webhook keeps failing: check `RAZORPAY_WEBHOOK_SECRET` matches the dashboard exactly and that `TRUSTED_PROXIES`/TLS are not altering the body.

### "Seats are wrong" or suspected oversell
Seat grabs are atomic in SQL (`seats_booked + n <= capacity`) and covered by a concurrency test on Postgres. To audit:
```sql
select id, capacity, seats_booked from batches where seats_booked > capacity;   -- must be empty
select b.id, b.seats_booked, coalesce(sum(k.traveller_count),0) as booked
  from batches b left join bookings k on k.batch_id=b.id and k.status in ('pending_payment','confirmed')
  group by b.id having b.seats_booked <> coalesce(sum(k.traveller_count),0);      -- drift
```
Drift means the scheduler stopped (expired holds not released): fix the scheduler, then run `php artisan bookings:release-expired`.

### Emails are not arriving
Check the worker is running (`queue:work`), `php artisan queue:failed`, and the provider dashboard. After fixing: `php artisan queue:retry all`. Customers can always see status and invoices in their account, so this is not a payments incident.

### Login problems / lockouts
Five wrong passwords for one email from one client lock that pair for 5 minutes (per account, not per IP alone). A locked customer can wait or use *Forgot password*. Staff who forgot their password use the same flow; a Super Admin can disable/re-enable accounts in Admin > Team.

### A staff member leaves or a device is lost
Admin > Team > disable the account (this ends access on the next request), and change their password if it may be reused elsewhere. Staff tokens expire after 12 hours regardless.

### Site slow
`/health` first. Then Postgres (slow query log, missing index: `pg_stat_statements`), Redis memory, and PHP-FPM worker saturation. The public catalogue is cached for 30 s at the HTTP layer and revalidated every 60 s by Next.js; a CDN in front of both multiplies this.

### Suspected data exposure
Rotate `APP_KEY` only with a plan (it invalidates encrypted data and sessions). Revoke all tokens: `php artisan tinker` -> `\Laravel\Sanctum\PersonalAccessToken::query()->delete();`. Preserve logs, export the audit log, and follow the legal notification duties for the business.

## 6. Routine tasks

| When | Task |
| --- | --- |
| Daily | Failed jobs, 5xx count, leads inbox, grievance SLA (Admin > Grievances) |
| Weekly | Reconcile Razorpay settlements with Admin > Payments; review pending refund/credit approvals |
| Monthly | `composer audit`, `pnpm audit --prod`; apply security updates; review staff accounts and roles |
| Quarterly | Restore drill; review rate limits and CSP; rotate the Razorpay webhook secret |

## 7. Secrets and rotation

- `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`: rotate in the Razorpay dashboard, update the environment, restart. Use a maintenance window: in-flight payments verified with the old secret will fail.
- `APP_KEY`: see above.
- Database and Redis passwords: rotate at the provider, update the environment, restart API and worker.

## 7. Production server hardening (indianrounds.in)

State of the single-server, non-Docker install, so it can be rebuilt or audited:

- **SSH**: key-only (`/etc/ssh/sshd_config.d/00-hardening.conf`: no passwords, root by key only, 3 tries). The GitHub Actions key is authorised for the `deploy` user with `restrict` (no pty/forwarding), and `deploy` can only `sudo` restart the app's own services (`/etc/sudoers.d/indianrounds-deploy`).
- **Network**: `ufw` allows 22/80/443 only; PostgreSQL, Redis and Next.js (`127.0.0.1:3000`) listen on loopback. fail2ban guards sshd.
- **nginx**: TLS via certbot (auto-renew), `server_tokens off`, 20 req/min per IP (burst 10) on `/api/v1/auth/*` and `/api/backend/auth/*` (`/etc/nginx/conf.d/ir-ratelimit.conf`) on top of the app's per-account lockout. Security headers (CSP, HSTS, nosniff, frame-deny) come from the Next.js app.
- **Secrets**: `apps/api/.env` is `640 deploy:www-data`; the DB password lives only there and in `/root/.ir_dbpw`. Backups in `/srv/backups` are `700`/owner-only (they contain customer data) and are **not off-site**: copy them elsewhere.
- **Patching**: `unattended-upgrades` is on. Kernel updates need a reboot (`/var/run/reboot-required` exists when one is pending); all services are enabled at boot.
- **Deploys**: GitHub Actions only, from a tag/release whose commit passed CI (see `.github/workflows/deploy.yml`, `scripts/deploy.sh`).

## 6. Importing the client's catalogue (packages workbook)

The client fills `docs/client-data/IndianRounds_Package_Data_Template.xlsx` (built by `scripts/build_client_template.py`; the sheet/column layout is the contract with `App\Services\CatalogueImporter`, so change both together). One command imports everything: destinations, categories per menu and country, packages, placements, itinerary, price options and departures.

**One-time server setup** (photos live outside the deployed code so a deploy never deletes them):
```bash
sudo install -d -o deploy -g deploy /srv/uploads/catalogue
# nginx, inside the HTTPS server block:   location /uploads/ { alias /srv/uploads/; expires 30d; access_log off; }
# apps/api/.env:                          CATALOGUE_IMAGES_PATH=/srv/uploads/catalogue     (then: php artisan config:cache)
```

**Each import**
1. Copy the completed workbook and the client's photos (unzipped into one folder) to the server, e.g. `/srv/import/`.
2. Take a backup first: `scripts/backup.sh`.
3. Dry run. Prints every problem with its sheet and row, and writes nothing:
   `cd /srv/indianrounds/apps/api && php artisan catalogue:import /srv/import/data.xlsx --images=/srv/import/photos --dry-run`
4. Fix the workbook with the client until the dry run says "Dry run OK", then run it without `--dry-run`. The whole workbook is validated first; nothing is written unless it is completely clean, and the write is a single transaction.

**Behaviour to know**
- Re-running is safe: destinations and categories are matched by name, packages by Package ID (`tours.code`), departures by start date. It updates; it never duplicates.
- It never removes anything: a package, departure or price option missing from a later workbook stays on the site (remove it in the admin). A departure with seats already booked never has its capacity lowered below the booked seats; price options that bookings point at are kept.
- Rows marked `EXAMPLE` / `EX-` are ignored.
- Menu placement drives site behaviour: a package placed under **Group Tours** becomes a group tour (needs departures), **Weekend Escapes** adds the `weekend` tag, **Honeymoon** adds the `couples` tag; the Family / Luxury / Festival / Christmas columns add their tags. Special Offers fills itself from packages whose original price is higher than the price.
- A menu with no categories yet falls back to the old listing (`/group-tours` redirects to `/tours?type=group`, etc.), so the header links never dead-end.

### Replacing all destinations from a destinations workbook
`php artisan catalogue:replace-destinations /srv/import/destinations.xlsx --dry-run` previews; without `--dry-run` it **removes every destination together with its packages, departures, price options and categories**, then adds the workbook's rows (Country | Destination Name | Tagline | On Season | Off Season | Mid Season, where each season reads `Oct–Mar | places | Peak activities: ...`). It refuses to run if a booking exists on a package it would remove. Take a backup first (`pg_dump -Fc`). Photos: a country reuses `web/public/photos/destinations/<slug>.jpg` when that file exists, otherwise it shows a placeholder until a photo is set in Admin > Destinations.

**After deleting content, clear the website's page cache.** The Next.js server keeps serving its last good copy of a page when the API now answers 404 (a refresh that fails does not replace the cached copy), so deleted destinations and tours stay visible, and survive a restart. Fix:
`systemctl stop indianrounds-web && rm -rf /srv/indianrounds/apps/web/.next/cache/fetch-cache && systemctl start indianrounds-web`
Adding or editing content needs no action; it appears within about a minute.

### Destination page content (facts, attractions, tips, FAQs)
Each destination page shows a written profile: overview, quick facts, reasons to go, top attractions, experiences, foods, essential tips, visa / health / money notes and FAQs. It is stored with the destination (Admin > Destinations > edit > "Page content") and anything left empty is hidden on the page. The starter text for the 12 countries ships in `apps/api/database/data/destination_profiles.json`.
`php artisan catalogue:seed-destination-content --dry-run` previews; without `--dry-run` it fills only the parts that are still empty, so edits made in the admin are kept. `--force` replaces existing text. Seasons, places and photos are never touched. Visa and entry rules in the starter text are general: check them against the official sources before relying on them.

### Catalogue content: categories, package write-ups, group trips and photos
`apps/api/database/data/catalogue/<destination-slug>.json` (one per destination) holds the written catalogue: browse categories ("groups of packages") per menu, the full write-up of each package (summary, overview, highlights, inclusions, exclusions, notes, must-carry, pickup and drop, photos) and new group trips with their itineraries and a departure plan. Photos live in `apps/web/public/photos/places/<destination>/<slot>.jpg`; `docs/photo-credits.md` lists where each came from (free-to-use stock photos).
- Check the files without a database: `php artisan catalogue:validate-content`.
- Apply: `php artisan catalogue:seed-packages-content --dry-run`, then without `--dry-run` (or one destination: `... thailand`). It is safe to re-run: it never changes a package's itinerary, status or a price entered by hand, only fills the write-up, links categories and generates group-trip departures when a trip has none. Photos already set are kept unless `--force` is given.
- **Sample pricing.** Group trips and packages marked "starting from" in these files carry placeholder prices and dates, tagged `sample-pricing`. Replace them in Admin > Tours (edit the price, add real departures) and remove the tag, or clear every remaining placeholder at once with `php artisan catalogue:clear-sample-pricing` (`--dry-run` lists them; it refuses while a departure has a booking). Do this before payments go live.

**Adding a whole new destination from a content file.** A catalogue content file may carry a `destination_record` (name, region, tagline, best time, places, on/off/mid seasons and the full page profile) plus `custom_trips` (private packages, with a sample price or none), `group_trips`, `honeymoon_trips` and its categories. If the destination does not exist yet, `catalogue:seed-packages-content` creates it (featured, with its seasons and profile) and then everything else, in one transaction; a dry run shows the counts and changes nothing. The ten India destinations (Kerala, Rajasthan, Goa, Himachal Pradesh, Kashmir, Ladakh, Andaman and Nicobar, Sikkim, Meghalaya, Uttarakhand) were added this way. Permit, road-closure and travel-time statements in the India content are general: check them against current official sources before relying on them.
