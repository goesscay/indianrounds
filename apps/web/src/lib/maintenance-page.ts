import type { Maintenance } from "./maintenance";
import { site } from "./site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const DEFAULT_MESSAGE = "We're carrying out scheduled maintenance to make your booking experience faster and more reliable. Thank you for your patience.";

/** Self-contained page (no layout, no JS) so it renders even if the rest of the app cannot. */
export function maintenanceHtml(m: Maintenance): string {
  const message = esc(m.message ?? DEFAULT_MESSAGE);
  const back = m.expected_back ? esc(m.expected_back) : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Under maintenance | ${esc(site.name)}</title>
<link rel="icon" href="/icon.png">
<style>
  :root { --red:#cc0a00; --red-dark:#a80800; --ink:#111827; --muted:#5b6472; --line:#e6e8ec; --tint:#fff4f3; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body { font-family: Poppins, "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; color: var(--ink); background: #f6f7f9; -webkit-font-smoothing: antialiased; }
  .bg { position: fixed; inset: 0; overflow: hidden; z-index: 0; pointer-events: none; }
  .bg::before { content: ""; position: absolute; width: 60vmax; height: 60vmax; left: -22vmax; top: -30vmax; border-radius: 50%; background: radial-gradient(circle, rgba(204,10,0,.13), transparent 65%); }
  .bg::after { content: ""; position: absolute; width: 50vmax; height: 50vmax; right: -20vmax; bottom: -26vmax; border-radius: 50%; background: radial-gradient(circle, rgba(17,24,39,.09), transparent 65%); }
  .wrap { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px; }
  .logo { height: 40px; width: auto; margin-bottom: 28px; }
  .card { width: 100%; max-width: 620px; background: #fff; border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 18px 50px rgba(17,24,39,.08); padding: 44px 40px 34px; text-align: center; }
  .icon { width: 76px; height: 76px; margin: 0 auto 22px; border-radius: 50%; background: var(--tint); display: grid; place-items: center; }
  .pill { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--red); background: var(--tint); padding: 6px 14px; border-radius: 999px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); animation: pulse 1.8s ease-in-out infinite; }
  h1 { margin: 18px 0 12px; font-size: 32px; line-height: 1.2; font-weight: 800; letter-spacing: -.01em; }
  p.msg { margin: 0 auto; max-width: 480px; font-size: 16px; line-height: 1.65; color: var(--muted); }
  .back { margin: 26px auto 0; display: inline-flex; align-items: center; gap: 12px; text-align: left; border: 1px solid var(--line); border-radius: 14px; padding: 12px 18px; background: #fafbfc; }
  .back small { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
  .back strong { font-size: 15px; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 32px 0 22px; }
  .help { font-size: 14px; color: var(--muted); margin: 0 0 12px; }
  .links { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .links a { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px; border: 1px solid var(--line); color: var(--ink); text-decoration: none; font-size: 14px; font-weight: 600; background: #fff; transition: border-color .15s, color .15s; }
  .links a:hover, .links a:focus-visible { border-color: var(--red); color: var(--red); outline: none; }
  footer { margin-top: 22px; font-size: 12.5px; color: var(--muted); text-align: center; }
  @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.7); } }
  @media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
  @media (max-width: 520px) { .card { padding: 32px 22px 26px; } h1 { font-size: 25px; } .logo { height: 34px; } }
</style>
</head>
<body>
<div class="bg" aria-hidden="true"></div>
<main class="wrap">
  <img class="logo" src="/brand/logo-header.png" alt="${esc(site.name)}" width="172" height="35">
  <section class="card" role="status" aria-live="polite">
    <div class="icon" aria-hidden="true">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cc0a00" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.5-.5-2.4z"/></svg>
    </div>
    <span class="pill"><span class="dot"></span>Scheduled maintenance</span>
    <h1>We&rsquo;ll be back shortly</h1>
    <p class="msg">${message}</p>
    ${back ? `<div class="back"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cc0a00" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><div><small>Expected back</small><strong>${back}</strong></div></div>` : ""}
    <hr>
    <p class="help">Need urgent help with an existing booking? We&rsquo;re still reachable.</p>
    <div class="links">
      <a href="${esc(site.phoneHref)}">${esc(site.phone)}</a>
      <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>
    </div>
  </section>
  <footer>&copy; ${new Date().getFullYear()} ${esc(site.name)} &middot; ${esc(site.tagline)}</footer>
</main>
</body>
</html>`;
}
