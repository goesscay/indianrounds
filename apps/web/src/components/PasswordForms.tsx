"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/client-api";
import { AuthShell, Field, inputClass } from "./AuthShell";

export function ForgotPasswordForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const email = new FormData(e.currentTarget).get("email");
    try {
      const res = await apiFetch<{ message: string }>("auth/forgot-password", { body: { email } });
      setMsg(res.message);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? (e2.first("email") ?? e2.message) : "Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <AuthShell title="Forgot" accent="password" sub="Enter your email and we will send a reset link.">
      {msg ? (
        <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">{msg}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" id="email">
            <input id="email" name="email" type="email" required className={inputClass} />
          </Field>
          {err && <p role="alert" className="text-sm text-brand-red">{err}</p>}
          <button disabled={busy} className="w-full rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60">Send reset link</button>
        </form>
      )}
      <Link href="/login" className="text-sm text-brand-red underline">Back to login</Link>
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      await apiFetch("auth/reset-password", { body: { ...f, token: params.get("token"), email: params.get("email") } });
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors.email || err.errors.password || err.errors.token ? err.errors : { password: [err.message] });
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset" accent="password">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="New password (10+ characters, letters and numbers)" id="password" error={errors.password?.[0] ?? errors.email?.[0] ?? errors.token?.[0]}>
          <input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" className={inputClass} />
        </Field>
        <Field label="Confirm new password" id="password_confirmation">
          <input id="password_confirmation" name="password_confirmation" type="password" minLength={10} required autoComplete="new-password" className={inputClass} />
        </Field>
        <button disabled={busy} className="w-full rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60">Reset password</button>
      </form>
    </AuthShell>
  );
}
