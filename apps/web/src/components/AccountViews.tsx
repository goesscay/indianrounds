"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CalendarDays, Ticket, Wallet } from "lucide-react";
import type { Booking, CreditNote, Grievance } from "@/lib/api";
import { ApiError, apiFetch } from "@/lib/client-api";
import { formatDate, formatINR } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";
import { AccountLayout } from "./AccountNav";
import { Field, inputClass } from "./AuthShell";

const noteStyle: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  redeemed: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-700",
};

export function AccountOverview() {
  const { user } = useAuth();
  const bookings = useApi<{ data: Booking[] }>("bookings");
  const notes = useApi<{ data: CreditNote[] }>("me/credit-notes");
  const tickets = useApi<{ data: Grievance[] }>("grievances");

  const today = new Date().toISOString().slice(0, 10);
  const live = (bookings.data?.data ?? []).filter((b) => b.status === "confirmed" || b.status === "pending_payment");
  const upcoming = live.filter((b) => b.departure.starts_on >= today).sort((a, b) => a.departure.starts_on.localeCompare(b.departure.starts_on));
  const dues = live
    .flatMap((b) => b.milestones.filter((m) => m.status === "due").map((m) => ({ b, m })))
    .sort((a, b) => a.m.due_on.localeCompare(b.m.due_on))
    .slice(0, 4);
  const credit = (notes.data?.data ?? []).filter((n) => n.status === "active").reduce((s, n) => s + n.amount, 0);
  const openTickets = (tickets.data?.data ?? []).filter((t) => t.status === "open").length;

  return (
    <AccountLayout title="Hello," accent={user?.name.split(" ")[0] ?? ""}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/bookings" className="rounded-card bg-surface-alt p-5 hover:ring-2 hover:ring-brand-red/30">
          <CalendarDays className="mb-2 text-brand-red" />
          <p className="text-2xl font-extrabold">{upcoming.length}</p>
          <p className="text-sm text-muted">Upcoming trip{upcoming.length === 1 ? "" : "s"}</p>
        </Link>
        <Link href="/account/credit-notes" className="rounded-card bg-surface-alt p-5 hover:ring-2 hover:ring-brand-red/30">
          <Wallet className="mb-2 text-brand-red" />
          <p className="text-2xl font-extrabold">{formatINR(credit)}</p>
          <p className="text-sm text-muted">Credit available</p>
        </Link>
        <Link href="/account/support" className="rounded-card bg-surface-alt p-5 hover:ring-2 hover:ring-brand-red/30">
          <Ticket className="mb-2 text-brand-red" />
          <p className="text-2xl font-extrabold">{openTickets}</p>
          <p className="text-sm text-muted">Open support ticket{openTickets === 1 ? "" : "s"}</p>
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">Next trip</h2>
        {bookings.loading && <p className="text-muted">Loading…</p>}
        {!bookings.loading && upcoming.length === 0 && (
          <div className="rounded-card border border-black/10 p-6 text-center">
            <p className="font-semibold">No upcoming trips.</p>
            <Link href="/tours" className="mt-2 inline-block text-brand-red underline">Find your next adventure</Link>
          </div>
        )}
        {upcoming[0] && (
          <Link href={`/bookings/${upcoming[0].reference}`} className="block rounded-card border border-black/10 p-5 hover:border-brand-red">
            <p className="font-bold">{upcoming[0].tour.title}</p>
            <p className="text-sm text-muted">Departs {formatDate(upcoming[0].departure.starts_on)} · {upcoming[0].traveller_count} traveller{upcoming[0].traveller_count === 1 ? "" : "s"} · {upcoming[0].reference}</p>
          </Link>
        )}
      </section>

      {dues.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-extrabold">Payments due</h2>
          <ul className="divide-y divide-black/5 rounded-card border border-black/10">
            {dues.map(({ b, m }) => (
              <li key={m.id}>
                <Link href={`/bookings/${b.reference}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-surface-alt">
                  <span>
                    <span className="font-semibold">{b.tour.title}</span>
                    <span className="block text-xs text-muted">{m.label} · due {formatDate(m.due_on)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <strong>{formatINR(m.amount)}</strong>
                    {m.due_on < today && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Overdue</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AccountLayout>
  );
}

export function CreditNotesView() {
  const notes = useApi<{ data: CreditNote[] }>("me/credit-notes");
  const list = notes.data?.data ?? [];

  return (
    <AccountLayout title="Credit" accent="notes">
      <p className="mb-6 text-sm text-muted">
        When a booking is cancelled, the returnable amount can be issued as a credit note valid for 12 months. Use it on a new booking at checkout. A credit note is used in full on one booking.
      </p>
      {notes.loading && <p className="text-muted">Loading…</p>}
      {!notes.loading && list.length === 0 && <div className="rounded-card bg-surface-alt p-8 text-center"><p className="font-semibold">You have no credit notes.</p></div>}
      <ul className="space-y-3">
        {list.map((n) => (
          <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-black/10 p-5">
            <div>
              <p className="font-mono text-sm font-bold">{n.code}</p>
              <p className="text-xs text-muted">From {n.source} · {n.source_tour}</p>
              <p className="text-xs text-muted">Issued {formatDate(n.issued_on)} · {n.status === "active" ? "expires" : "expired/used"} {formatDate(n.expires_on)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold">{formatINR(n.amount)}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${noteStyle[n.status]}`}>{n.status}</span>
            </div>
          </li>
        ))}
      </ul>
      {list.some((n) => n.status === "active") && (
        <Link href="/tours" className="mt-6 inline-block rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark">Use on a new trip</Link>
      )}
    </AccountLayout>
  );
}

const stageLabel = { 1: "Support team", 2: "Escalation", 3: "Final review" } as const;

export function SupportView() {
  const tickets = useApi<{ data: Grievance[] }>("grievances");
  const bookings = useApi<{ data: Booking[] }>("bookings");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [sentRef, setSentRef] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setErrors({});
    const f = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await apiFetch<{ data: Grievance }>("grievances", { body: { subject: f.subject, description: f.description, booking_reference: f.booking_reference || undefined } });
      setSentRef(res.data.reference);
      form.reset();
      tickets.reload();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
    }
    setBusy(false);
  }

  const list = tickets.data?.data ?? [];

  return (
    <AccountLayout title="Customer" accent="support">
      <p className="mb-6 text-sm text-muted">Tell us what went wrong. We acknowledge every ticket within 48 hours and aim to resolve within 15 days; you can follow each stage here.</p>

      <section className="rounded-card border border-black/10 p-5">
        <h2 className="mb-4 text-lg font-extrabold">Raise a ticket</h2>
        {sentRef && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Ticket <strong>{sentRef}</strong> created. We will acknowledge it within 48 hours.</p>}
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Related booking (optional)" id="g-booking" error={errors.booking_reference?.[0]}>
            <select id="g-booking" name="booking_reference" defaultValue="" className={inputClass}>
              <option value="">Not about a specific booking</option>
              {(bookings.data?.data ?? []).map((b) => (
                <option key={b.reference} value={b.reference}>{b.reference} — {b.tour.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject *" id="g-subject" error={errors.subject?.[0]}>
            <input id="g-subject" name="subject" required maxLength={160} className={inputClass} />
          </Field>
          <Field label="What happened? *" id="g-desc" error={errors.description?.[0]}>
            <textarea id="g-desc" name="description" required rows={5} className={inputClass} />
          </Field>
          <button disabled={busy} className="rounded-full bg-brand-red px-7 py-3 font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60">{busy ? "Sending…" : "Submit ticket"}</button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">Your tickets</h2>
        {!tickets.loading && list.length === 0 && <p className="text-sm text-muted">No tickets yet.</p>}
        <ul className="space-y-3">
          {list.map((g) => (
            <li key={g.reference}>
              <Link href={`/account/support/${g.reference}`} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-black/10 p-4 hover:border-brand-red">
                <span>
                  <span className="font-semibold">{g.subject}</span>
                  <span className="block text-xs text-muted">{g.reference} · opened {formatDate(g.created_at.slice(0, 10))}</span>
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${g.status === "resolved" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {g.status === "resolved" ? "Resolved" : `Open · ${stageLabel[g.stage]}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AccountLayout>
  );
}

export function SupportDetailView({ reference }: { reference: string }) {
  const t = useApi<{ data: Grievance }>(`grievances/${reference}`);
  const g = t.data?.data;

  const steps = g
    ? [
        { label: "Ticket raised", done: true, at: g.created_at },
        { label: "Acknowledged", done: Boolean(g.acknowledged_at), at: g.acknowledged_at, due: g.ack_due_at },
        { label: `Under review — ${stageLabel[g.stage]}`, done: g.status === "resolved" || g.stage > 1, at: null as string | null },
        { label: "Resolved", done: g.status === "resolved", at: g.resolved_at, due: g.resolve_by },
      ]
    : [];

  return (
    <AccountLayout title="Support" accent="ticket">
      <Link href="/account/support" className="text-sm font-semibold text-brand-red">← All tickets</Link>
      {t.loading && <p className="mt-4 text-muted">Loading…</p>}
      {t.error && <p className="mt-4 text-muted">Ticket not found.</p>}
      {g && (
        <div className="mt-4 space-y-6">
          <div className="rounded-card bg-surface-alt p-5">
            <p className="text-xs text-muted">{g.reference}{g.booking_reference ? ` · Booking ${g.booking_reference}` : ""}</p>
            <h2 className="text-xl font-extrabold">{g.subject}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{g.description}</p>
            {g.officer_name && <p className="mt-3 text-sm text-muted">Assigned to {g.officer_name}</p>}
          </div>
          <ol className="space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex gap-3">
                <span className={`mt-1 size-3 shrink-0 rounded-full ${s.done ? "bg-green-600" : "bg-black/20"}`} />
                <div>
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-xs text-muted">
                    {s.at ? formatDate(s.at.slice(0, 10)) : s.due ? `Target: ${formatDate(s.due.slice(0, 10))}` : "Pending"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted">Every complaint is targeted for resolution within 15 days and never later than {formatDate(g.statutory_deadline.slice(0, 10))}. If you are unhappy with the outcome it is escalated to the next stage.</p>
        </div>
      )}
    </AccountLayout>
  );
}

export function ProfileView() {
  const { user, setUser } = useAuth();
  const states = useApi<{ data: string[] }>("meta/states");
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErrors, setPwErrors] = useState<Record<string, string[]>>({});

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErrors({});
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await apiFetch<{ data: NonNullable<typeof user> }>("me", { method: "PATCH", body: { name: f.name, phone: f.phone, gst_state: f.gst_state || null } });
      setUser(res.data);
      setMsg("Profile saved.");
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPwMsg(null);
    setPwErrors({});
    const f = Object.fromEntries(new FormData(form).entries());
    try {
      await apiFetch("me/password", { body: f });
      setPwMsg("Password updated. Other devices were signed out.");
      form.reset();
    } catch (err) {
      if (err instanceof ApiError) setPwErrors(err.errors);
    }
  }

  return (
    <AccountLayout title="My" accent="profile">
      {user && (
        <form key={user.id} onSubmit={saveProfile} className="space-y-4 rounded-card border border-black/10 p-5">
          <h2 className="text-lg font-extrabold">Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" id="p-name" error={errors.name?.[0]}>
              <input id="p-name" name="name" defaultValue={user.name} required className={inputClass} />
            </Field>
            <Field label="Email" id="p-email">
              <input id="p-email" value={user.email} disabled className={`${inputClass} bg-surface-alt`} />
            </Field>
            <Field label="Mobile number" id="p-phone" error={errors.phone?.[0]}>
              <input id="p-phone" name="phone" defaultValue={user.phone ?? ""} inputMode="numeric" className={inputClass} />
            </Field>
            <Field label="GST state (billing)" id="p-state" error={errors.gst_state?.[0]}>
              <select id="p-state" name="gst_state" defaultValue={user.gst_state ?? ""} className={inputClass}>
                <option value="">Not set</option>
                {(states.data?.data ?? []).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          <button className="rounded-full bg-brand-red px-6 py-2.5 font-semibold text-white hover:bg-brand-red-dark">Save changes</button>
        </form>
      )}

      <form onSubmit={changePassword} className="mt-8 space-y-4 rounded-card border border-black/10 p-5">
        <h2 className="text-lg font-extrabold">Change password</h2>
        <Field label="Current password" id="pw-current" error={pwErrors.current_password?.[0]}>
          <input id="pw-current" name="current_password" type="password" autoComplete="current-password" className={inputClass} />
        </Field>
        <Field label="New password (10+ characters, letters and numbers)" id="pw-new" error={pwErrors.password?.[0]}>
          <input id="pw-new" name="password" type="password" minLength={10} required autoComplete="new-password" className={inputClass} />
        </Field>
        <Field label="Confirm new password" id="pw-confirm">
          <input id="pw-confirm" name="password_confirmation" type="password" minLength={10} required autoComplete="new-password" className={inputClass} />
        </Field>
        {pwMsg && <p className="text-sm text-green-700">{pwMsg}</p>}
        <button className="rounded-full border border-brand-red px-6 py-2.5 font-semibold text-brand-red hover:bg-brand-red/5">Update password</button>
      </form>
    </AccountLayout>
  );
}
