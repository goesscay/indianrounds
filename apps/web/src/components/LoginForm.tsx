"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, apiFetch, safeNext } from "@/lib/client-api";
import { useAuth, type User } from "@/lib/auth";
import { AuthShell, Field, GoogleButton, inputClass } from "./AuthShell";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(params.get("error") ? "Google sign-in failed. Please try again." : null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiFetch<{ data: User }>("auth/login", { body: { email: form.get("email"), password: form.get("password") } });
      setUser(res.data);
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? (err.first("email") ?? err.message) : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome" accent="back" sub="Log in to book tours and manage your trips.">
      <GoogleButton next={next} />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" id="email">
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Password" id="password">
          <input id="password" name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </Field>
        {error && <p role="alert" className="text-sm text-brand-red">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60">
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-red underline">Forgot password?</Link>
        <span>
          New here? <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-red underline">Create an account</Link>
        </span>
      </div>
    </AuthShell>
  );
}
