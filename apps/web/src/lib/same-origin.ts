/** True when a state-changing browser request was initiated from this same site. */
export function sameOrigin(req: { headers: Headers }): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser callers (and same-origin GET-less tools) send no Origin
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
