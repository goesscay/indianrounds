#!/usr/bin/env node
/**
 * Booking load / concurrency test. No dependencies (Node 20+).
 *
 *   cd apps/api && php artisan loadtest:prepare --users=60 --seats=10
 *   node load/booking-load.mjs [--api http://localhost:8000/api/v1] [--read-seconds 15] [--read-concurrency 20]
 *   cd apps/api && php artisan loadtest:prepare --cleanup
 *
 * Needs PAYMENT_DRIVER=fake on the API (payments are simulated) and a NON-production database.
 * Phases:
 *   1. Oversell race  - every user tries to book the same last seats at the same instant.
 *                       PASS = exactly `capacity` bookings succeed, the rest are refused, seats_left is 0.
 *   2. Payment burst  - every successful booking pays its advance concurrently. PASS = all confirmed.
 *   3. Read traffic   - sustained GETs on the public catalogue; reports throughput and latency percentiles.
 * Exit code is non-zero if a correctness check (1 or 2) fails.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const API = arg("api", "http://localhost:8000/api/v1");
const READ_SECONDS = Number(arg("read-seconds", 15));
const READ_CONCURRENCY = Number(arg("read-concurrency", 20));
const data = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "tokens.json"), "utf8"));

const pct = (arr, p) => (arr.length ? [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0);
const summary = (label, ms) => `${label}: n=${ms.length} p50=${pct(ms, 50).toFixed(0)}ms p95=${pct(ms, 95).toFixed(0)}ms p99=${pct(ms, 99).toFixed(0)}ms max=${Math.max(0, ...ms).toFixed(0)}ms`;

async function call(path, { token, method = "GET", body } = {}) {
  const t0 = performance.now();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, ms: performance.now() - t0 };
}

let failed = false;
const check = (ok, message) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${message}`);
  if (!ok) failed = true;
};

// ---- Phase 1: oversell race ----
console.log(`\n== 1. Oversell race: ${data.users.length} users, ${data.capacity} seats ==`);
const booking = (u, i) => call("/bookings", {
  token: u.token, method: "POST",
  body: {
    tour_slug: data.tour, batch_id: data.batch_id, gst_state: "Tamil Nadu",
    contact: { name: `Load Tester ${i + 1}`, phone: "9876543210", email: u.email },
    travellers: [{ name: `Load Tester ${i + 1}` }],
  },
});
const race = await Promise.all(data.users.map(booking));
const won = race.filter((r) => r.status === 201);
const refused = race.filter((r) => r.status !== 201);
const codes = Object.entries(race.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {})).map(([k, v]) => `${k}x${v}`).join(" ");
console.log(`responses: ${codes}`);
console.log(summary("booking latency", race.map((r) => r.ms)));
check(won.length === data.capacity, `exactly ${data.capacity} bookings succeeded (got ${won.length})`);
check(refused.every((r) => r.status === 422 || r.status === 409), "all others were refused cleanly (422/409), none errored");
const batches = await call(`/tours/${data.tour}/batches`);
const left = batches.json.data?.batches?.find((b) => b.id === data.batch_id)?.seats_left;
check(left === 0, `seats_left is 0 afterwards (got ${left})`);

// ---- Phase 2: payment burst ----
console.log(`\n== 2. Payment burst: ${won.length} concurrent advance payments ==`);
const pay = await Promise.all(won.map(async (r, i) => {
  const user = data.users[race.indexOf(r)];
  const ref = r.json.data.reference;
  const milestone = r.json.data.milestones[0].id;
  const order = await call(`/bookings/${ref}/milestones/${milestone}/order`, { token: user.token, method: "POST", body: {} });
  const paid = await call(`/bookings/${ref}/milestones/${milestone}/simulate`, { token: user.token, method: "POST", body: {} });
  return { order, paid, ref };
}));
console.log(summary("order+pay latency", pay.map((p) => p.order.ms + p.paid.ms)));
check(pay.length > 0 && pay.every((p) => p.paid.status === 200 && p.paid.json.data?.status === "confirmed"), `all ${pay.length} bookings confirmed after paying`);

// ---- Phase 3: read traffic ----
console.log(`\n== 3. Read traffic: ${READ_CONCURRENCY} clients for ${READ_SECONDS}s ==`);
const paths = ["/tours?per_page=12", "/destinations", `/tours/${data.tour}`, "/posts", "/collections"];
const lat = [];
let errors = 0;
const stop = performance.now() + READ_SECONDS * 1000;
await Promise.all(Array.from({ length: READ_CONCURRENCY }, async (_, w) => {
  for (let i = w; performance.now() < stop; i++) {
    const r = await call(paths[i % paths.length]).catch(() => ({ status: 0, ms: 0 }));
    lat.push(r.ms);
    if (r.status !== 200) errors++;
  }
}));
console.log(`${lat.length} requests, ${(lat.length / READ_SECONDS).toFixed(0)} req/s, ${errors} errors`);
console.log(summary("read latency", lat));
console.log("(Read numbers from `php artisan serve` on a laptop are a floor, not a capacity plan: repeat against staging.)");
check(errors === 0, "no read errors");

console.log(failed ? "\nRESULT: FAILED" : "\nRESULT: PASSED");
process.exit(failed ? 1 : 0);
