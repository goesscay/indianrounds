import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin proxy to the Laravel API.
 * The Sanctum token lives in an httpOnly cookie, so browser JavaScript never sees it
 * and no cross-site cookie / CSRF setup is needed.
 */
const API_URL = process.env.API_URL ?? "http://localhost:8000/api/v1";
const COOKIE = "ir_token";
const ALLOWED = ["auth/", "me", "bookings", "tours/", "meta/", "leads/"];
const TOKEN_ENDPOINTS = new Set(["auth/login", "auth/register", "auth/google/exchange"]);

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = path.join("/");

  if (!ALLOWED.some((p) => (p.endsWith("/") ? target.startsWith(p) : target === p || target.startsWith(`${p}/`)))) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const hasBody = !["GET", "HEAD"].includes(req.method);
  if (hasBody) headers["Content-Type"] = "application/json";

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/${target}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "The service is unavailable. Please try again." }, { status: 502 });
  }

  const body = await upstream.json().catch(() => ({}));
  const res = NextResponse.json(target === "auth/login" || TOKEN_ENDPOINTS.has(target) ? stripToken(body) : body, { status: upstream.status });

  if (upstream.ok && TOKEN_ENDPOINTS.has(target) && body.token) {
    res.cookies.set(COOKIE, body.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  if (target === "auth/logout" || upstream.status === 401) {
    res.cookies.delete(COOKIE);
  }

  return res;
}

function stripToken(body: Record<string, unknown>) {
  const { token: _token, ...rest } = body;
  void _token;
  return rest;
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
