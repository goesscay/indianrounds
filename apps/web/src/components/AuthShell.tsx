import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20";

export function AuthShell({ title, accent, sub, children }: { title: string; accent: string; sub?: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.1fr] lg:px-8">
      <aside className="hidden rounded-card bg-gradient-to-br from-brand-red-dark to-brand-red p-8 text-white md:block">
        <p className="font-script text-4xl">Travel Beyond Borders</p>
        <ul className="mt-8 space-y-4 text-sm text-white/90">
          <li>✓ Book curated tours in a few steps</li>
          <li>✓ Pay in convenient instalments</li>
          <li>✓ Track every booking and invoice in one place</li>
        </ul>
      </aside>
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {title} <span className="text-brand-red">{accent}</span>
        </h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
        <div className="mt-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
    </div>
  );
}

export function GoogleButton({ next }: { next: string }) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  return (
    <>
      <a
        href={`${api}/auth/google/redirect`}
        onClick={() => sessionStorage.setItem("ir_next", next)}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-black/20 px-6 py-3 text-sm font-semibold hover:border-brand-red"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
          <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        Continue with Google
      </a>
      <p className="text-center text-xs text-muted">or use your email</p>
    </>
  );
}
