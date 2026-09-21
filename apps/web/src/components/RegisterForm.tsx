"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, apiFetch, safeNext } from "@/lib/client-api";
import { useAuth, type User } from "@/lib/auth";
import { AuthShell, Field, GoogleButton, inputClass } from "./AuthShell";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { setUser } = useAuth();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [states, setStates] = useState<string[]>([]);

  useEffect(() => {
    apiFetch<{ data: string[] }>("meta/states").then((r) => setStates(r.data)).catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await apiFetch<{ data: User }>("auth/register", { body: { ...f, gst_state: f.gst_state || undefined } });
      setUser(res.data);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors);
        if (Object.keys(err.errors).length === 0) setMessage(err.message);
      }
      setBusy(false);
    }
  }

  const e1 = (k: string) => errors[k]?.[0];

  return (
    <AuthShell title="Create your" accent="account" sub="One account for all your bookings.">
      <GoogleButton next={next} />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full name" id="name" error={e1("name")}>
          <input id="name" name="name" required autoComplete="name" className={inputClass} />
        </Field>
        <Field label="Email" id="email" error={e1("email")}>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Mobile number" id="phone" error={e1("phone")}>
          <input id="phone" name="phone" inputMode="numeric" required autoComplete="tel-national" placeholder="9876543210" className={inputClass} />
        </Field>
        <Field label="State (for GST invoice)" id="gst_state" error={e1("gst_state")}>
          <select id="gst_state" name="gst_state" defaultValue="" className={inputClass}>
            <option value="">Select your state</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Password (10+ characters, letters and numbers)" id="password" error={e1("password")}>
          <input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" className={inputClass} />
        </Field>
        <Field label="Confirm password" id="password_confirmation">
          <input id="password_confirmation" name="password_confirmation" type="password" minLength={10} required autoComplete="new-password" className={inputClass} />
        </Field>
        {message && <p role="alert" className="text-sm text-brand-red">{message}</p>}
        <button disabled={busy} className="w-full rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60">
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="text-xs text-muted">
          By signing up you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
      <p className="text-sm">
        Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-red underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
