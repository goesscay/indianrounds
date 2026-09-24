import { NextResponse, type NextRequest } from "next/server";
import { getMaintenance, type Maintenance } from "@/lib/maintenance";
import { maintenanceHtml } from "@/lib/maintenance-page";

/** Paths that stay reachable during maintenance: the back office (so it can be switched off), sign-in and the auth callback, and the API proxy. */
const OPEN = ["/admin", "/login", "/forgot-password", "/reset-password", "/auth", "/api", "/robots.txt"];

// The switch is read at most once every few seconds per server process.
let cached: { at: number; state: Maintenance } | null = null;

async function state() {
  if (cached && Date.now() - cached.at < 5000) return cached.state;
  const s = await getMaintenance();
  cached = { at: Date.now(), state: s };
  return s;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const m = await state();
  if (!m.enabled) return NextResponse.next();

  return new NextResponse(maintenanceHtml(m), {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "3600", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand|photos|favicon.ico|icon.png|apple-icon.png).*)"],
};
