# Security review (Phase 6)

Scope: the Laravel API, the Next.js site and its same-origin proxy, and the deployment assumptions. This is an internal review by the developers, not an independent penetration test; one is recommended before significant marketing spend.

## What was reviewed and the result

| Area | Finding | Action taken |
| --- | --- | --- |
| **Brute force on login** | Only a per-IP limit existed. Behind the Next.js proxy every visitor shares the server's IP, so the limit would have counted the whole site as one client. | Per-account+client lockout (5 misses -> 5 min). The proxy forwards the visitor's IP (`X-Forwarded-For`) and the API trusts it only from `TRUSTED_PROXIES`. |
| **User enumeration** | Unknown-email logins skipped the password hash (timing difference); forgot-password returned a 500 only for real accounts if mail was down. | A dummy hash equalises timing; identical error bodies; forgot-password swallows and logs mail errors and answers the same. |
| **Password policy** | Minimum 8, no composition. | Minimum 10 with letters and numbers (server-enforced, mirrored in the forms). |
| **Token lifetime** | Sanctum tokens never expired. | Staff tokens 12 h, customer tokens 30 d, global 30 d cap; expired tokens pruned daily. Disabling a staff user revokes their tokens immediately. |
| **Authorization** | Admin routes use `auth:sanctum` + `staff` ability + a per-route permission; a customer token can never reach `/admin`. | A test now fails if any admin route lacks these, and if any new public write endpoint or an unthrottled one appears. |
| **Public write endpoints** | Register, login, reset, leads, careers apply, Google exchange, Razorpay webhook. | All are rate limited except the webhook, which is authenticated by HMAC signature and idempotent on the event id (tested). |
| **CSRF / cross-site writes** | Token is in an `httpOnly`, `SameSite=Lax` cookie held by the Next.js proxy. | Proxy additionally rejects non-GET requests whose `Origin` is not this site. API CORS has credentials **off** (bearer tokens only). |
| **Security headers** | None. | Web: CSP, HSTS (prod), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, COOP. API: `nosniff`, `DENY`, `default-src 'none'`, HSTS on HTTPS, `no-store` on anything token-bound. |
| **Mail failure on the payment path** | Confirmation email was sent inline after the payment commit: an SMTP outage would return a 500 to a customer who had already paid. | Emails are queued after commit with retries and back-off; payments and cancellations no longer depend on mail. |
| **Health/monitoring** | `/health` returned a static "ok". | Checks database and cache (503 if down) and the scheduler heartbeat (degraded if stale). |
| **Production misconfiguration** | Easy to ship with debug on, test keys, demo accounts or the fake gateway. | `php artisan launch:check` fails on each of these; the fake gateway also refuses to boot in production. |
| **Uploads** | Résumés: extension and content-type checked, 5 MB cap, stored on the **private** disk, downloadable only via an authorised, audited endpoint. | No change. There is no antivirus scan (see residual risks). |
| **XSS** | Blog bodies are user-authored text. | Rendered by a small renderer that emits React elements only (no `dangerouslySetInnerHTML`); unsafe link schemes are dropped; covered by unit tests. |
| **SQL injection** | Eloquent/Query Builder with bindings; LIKE terms escape `%` and `_`. | None needed. |
| **Money integrity** | Payment/ledger rows are appended, not edited; markPaid is idempotent under row locks; seat grab is atomic in SQL. | Concurrency test runs in CI on Postgres. |
| **Dependencies** | `composer audit` and `pnpm audit --prod` report no known vulnerabilities at the time of review. | Both run in CI. |
| **Secrets** | Not in git; `.env.example` lists every key. | Rotation steps in `docs/runbook.md`. |

## Residual risks and recommendations

1. **CSP allows inline scripts.** Next.js and the JSON-LD blocks need them; removing `'unsafe-inline'` requires per-request nonces, which makes every public page dynamic (slower, uncacheable). Acceptable for now because there is no raw-HTML rendering path; revisit if CSP strictness becomes a requirement.
2. **Staff have no second factor.** Staff hold refund, credit-note and pricing powers. Strongly recommended before launch: TOTP 2FA for all staff accounts (and/or SSO). Not implemented.
3. **Registration reveals whether an email is registered** ("email already taken"). This is standard for sign-up flows and mitigated by the rate limit; a fully enumeration-proof flow needs email-first verification.
4. **No malware scan on résumés.** They are never served to the public and only downloadable by HR, but download them on managed devices; add ClamAV if volume grows.
5. **Rate limits need shared state.** They use the cache store; production must use Redis (the launch check warns otherwise), or limits are per server.
6. **X-Forwarded-For trust.** If the Node server is reachable directly from the internet, clients could spoof their IP to dodge per-IP limits. Keep it behind the load balancer and set `TRUSTED_PROXIES` narrowly.
7. **The reference policies** (instalments, cancellation tiers, credit-note validity) were modelled on another operator's public terms; the business must adopt or amend them as its own with legal advice.
8. **Independent testing.** Commission a penetration test focusing on authentication, the payment flow, the admin permission matrix and file upload.
