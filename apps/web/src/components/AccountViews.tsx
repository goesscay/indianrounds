"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Compass, Headset, KeyRound, LifeBuoy, Map as MapIcon, Phone, Search, Ticket, UserRound, Wallet } from "lucide-react";
import type { Booking, CreditNote, Grievance } from "@/lib/api";
import { ApiError, apiFetch } from "@/lib/client-api";
import { formatDate, formatINR } from "@/lib/format";
import { site } from "@/lib/site";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";
import { AccountLayout } from "./AccountNav";
import { Card, EmptyState, ListSkeleton, OutlineLink, PrimaryLink, StatusBadge, daysUntil } from "./AccountUI";
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
  const next = upcoming[0];
  const toGo = next ? daysUntil(next.departure.starts_on) : 0;

  const stats = [
    { href: "/bookings", icon: CalendarDays, value: String(upcoming.length), label: `Upcoming trip${upcoming.length === 1 ? "" : "s"}`, tone: "bg-brand-red/10 text-brand-red" },
    { href: "/account/credit-notes", icon: Wallet, value: formatINR(credit), label: "Credit available", tone: "bg-green-100 text-green-700" },
    { href: "/account/support", icon: Ticket, value: String(openTickets), label: `Open support ticket${openTickets === 1 ? "" : "s"}`, tone: "bg-amber-100 text-amber-700" },
  ];

  return (
    <AccountLayout title="Hello," accent={user?.name.split(" ")[0] ?? ""} subtitle="Here is where your trips, payments and support stand.">
      <ul className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ href, icon: Icon, value, label, tone }) => (
          <li key={label}>
            <Link href={href} className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-red hover:shadow-float">
              <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={22} aria-hidden /></span>
              <span>
                <span className="block text-2xl font-extrabold leading-tight">{value}</span>
                <span className="block text-sm text-muted">{label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section aria-labelledby="next-h">
            <h2 id="next-h" className="mb-3 text-xl font-extrabold">Next trip</h2>
            {bookings.loading && <ListSkeleton rows={1} />}
            {!bookings.loading && !next && (
              <EmptyState icon={MapIcon} title="No upcoming trips" text="Find your next adventure and it will show up here.">
                <PrimaryLink href="/group-tours">Browse group tours</PrimaryLink>
                <OutlineLink href="/weekend-escapes">Weekend escapes</OutlineLink>
              </EmptyState>
            )}
            {next && (
              <Link href={`/bookings/${next.reference}`} className="group block rounded-3xl bg-gradient-to-br from-ink to-slate-800 p-6 text-white shadow-sm transition hover:shadow-float sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-widest text-amber-300">{next.reference}</p>
                    <p className="mt-1 text-2xl font-extrabold leading-tight">{next.tour.title}</p>
                    <p className="mt-2 text-sm text-white/80">{formatDate(next.departure.starts_on)} – {formatDate(next.departure.ends_on)} · {next.traveller_count} traveller{next.traveller_count === 1 ? "" : "s"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-extrabold leading-none text-amber-300">{toGo}</p>
                    <p className="text-xs uppercase tracking-wide text-white/70">day{toGo === 1 ? "" : "s"} to go</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge status={next.status} />
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">View booking <ArrowRight size={15} className="transition group-hover:translate-x-1" aria-hidden /></span>
                </div>
              </Link>
            )}
          </section>

          {dues.length > 0 && (
            <section aria-labelledby="dues-h">
              <h2 id="dues-h" className="mb-3 text-xl font-extrabold">Payments due</h2>
              <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                {dues.map(({ b, m }) => (
                  <li key={m.id}>
                    <Link href={`/bookings/${b.reference}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface-alt">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{b.tour.title}</span>
                        <span className="block text-xs text-muted">{m.label} · due {formatDate(m.due_on)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {m.due_on < today && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Overdue</span>}
                        <strong className="text-lg">{formatINR(m.amount)}</strong>
                        <ArrowRight size={15} className="text-muted" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <Card title="Quick links" icon={Compass}>
            <ul className="space-y-1 text-sm">
              {[
                { href: "/group-tours", label: "Browse group tours", icon: Search },
                { href: "/account/support", label: "Raise a support ticket", icon: LifeBuoy },
                { href: "/account/profile", label: "Edit my profile", icon: UserRound },
              ].map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2.5 font-medium hover:bg-surface-alt hover:text-brand-red">
                    <Icon size={16} className="text-brand-red" aria-hidden /> {label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Need help?" icon={Headset}>
            <p className="text-sm text-muted">Office hours: {site.hours}</p>
            <a href={site.phoneHref} className="mt-3 flex items-center gap-2 text-sm font-semibold hover:text-brand-red"><Phone size={15} className="text-brand-red" aria-hidden /> {site.phone}</a>
            <Link href="/contact" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-red hover:underline">Contact us <ArrowRight size={14} aria-hidden /></Link>
          </Card>
        </aside>
      </div>
    </AccountLayout>
  );
}

export function CreditNotesView() {
  const notes = useApi<{ data: CreditNote[] }>("me/credit-notes");
  const list = notes.data?.data ?? [];

  return (
    <AccountLayout title="Credit" accent="notes" subtitle="Money kept aside from cancelled bookings, ready to use on your next trip.">
      <p className="mb-6 rounded-2xl bg-surface-alt px-5 py-4 text-sm text-muted">
        When a booking is cancelled, the returnable amount can be issued as a credit note valid for 12 months. Use it on a new booking at checkout. A credit note is used in full on one booking.
      </p>
      {notes.loading && <ListSkeleton rows={2} />}
      {!notes.loading && list.length === 0 && (
        <EmptyState icon={Wallet} title="You have no credit notes" text="If you cancel a booking and choose a credit note, it will appear here." />
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {list.map((n) => (
          <li key={n.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${n.status === "active" ? "border-green-200" : "border-black/10 opacity-80"}`}>
            <div className="flex items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Credit note</p>
                <p className="mt-0.5 font-mono text-sm font-bold">{n.code}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${noteStyle[n.status]}`}>{n.status}</span>
            </div>
            <p className="px-5 text-3xl font-extrabold">{formatINR(n.amount)}</p>
            <div className="mt-4 border-t border-dashed border-black/15 bg-surface-alt px-5 py-3 text-xs text-muted">
              <p>From {n.source} · {n.source_tour}</p>
              <p className="mt-0.5">Issued {formatDate(n.issued_on)} · {n.status === "active" ? "expires" : "expired or used"} {formatDate(n.expires_on)}</p>
            </div>
          </li>
        ))}
      </ul>
      {list.some((n) => n.status === "active") && (
        <div className="mt-6"><PrimaryLink href="/group-tours">Use on a new trip</PrimaryLink></div>
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
    <AccountLayout title="Customer" accent="support" subtitle="Tell us what went wrong. We acknowledge every ticket within 48 hours and aim to resolve within 15 days; you can follow each stage here.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Raise a ticket" icon={LifeBuoy}>
          {sentRef && <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden /> <span>Ticket <strong>{sentRef}</strong> created. We will acknowledge it within 48 hours.</span></p>}
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
        </Card>

        <section aria-labelledby="tickets-h">
          <h2 id="tickets-h" className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Ticket size={19} className="text-brand-red" aria-hidden /> Your tickets</h2>
          {tickets.loading && <ListSkeleton rows={2} />}
          {!tickets.loading && list.length === 0 && <EmptyState icon={Ticket} title="No tickets yet" text="Your tickets and their progress will appear here." />}
          <ul className="space-y-3">
            {list.map((g) => (
              <li key={g.reference}>
                <Link href={`/account/support/${g.reference}`} className="block rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-red hover:shadow-float">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{g.subject}</span>
                      <span className="block text-xs text-muted">{g.reference} · opened {formatDate(g.created_at.slice(0, 10))}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${g.status === "resolved" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {g.status === "resolved" ? "Resolved" : `Open · ${stageLabel[g.stage]}`}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
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
      <Link href="/account/support" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-red hover:underline">← All tickets</Link>
      {t.loading && <ListSkeleton rows={2} />}
      {t.error && <EmptyState icon={Ticket} title="Ticket not found"><PrimaryLink href="/account/support">Back to my tickets</PrimaryLink></EmptyState>}
      {g && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-red">{g.reference}{g.booking_reference ? ` · Booking ${g.booking_reference}` : ""}</p>
            <h2 className="mt-1 text-xl font-extrabold">{g.subject}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{g.description}</p>
            {g.officer_name && <p className="mt-4 rounded-lg bg-surface-alt px-3 py-2 text-sm text-muted">Assigned to {g.officer_name}</p>}
            <p className="mt-4 text-xs text-muted">Every complaint is targeted for resolution within 15 days and never later than {formatDate(g.statutory_deadline.slice(0, 10))}. If you are unhappy with the outcome it is escalated to the next stage.</p>
          </section>
          <Card title="Progress" icon={CheckCircle2}>
            <ol>
              {steps.map((s, i) => (
                <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < steps.length - 1 && <span className={`absolute left-[9px] top-5 h-full w-px ${s.done ? "bg-green-600" : "bg-black/15"}`} aria-hidden />}
                  <span className={`relative z-10 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] text-white ${s.done ? "bg-green-600" : "bg-black/20"}`} aria-hidden>{s.done ? "✓" : ""}</span>
                  <div>
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-xs text-muted">{s.at ? formatDate(s.at.slice(0, 10)) : s.due ? `Target: ${formatDate(s.due.slice(0, 10))}` : "Pending"}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
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
    <AccountLayout title="My" accent="profile" subtitle="Your contact details, billing state and password.">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {user && (
          <Card title="Details" icon={UserRound}>
            <form key={user.id} onSubmit={saveProfile} className="space-y-4">
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
              {msg && <p role="status" className="text-sm text-green-700">{msg}</p>}
              <button className="rounded-full bg-brand-red px-6 py-2.5 font-semibold text-white hover:bg-brand-red-dark">Save changes</button>
            </form>
          </Card>
        )}

        <Card title="Change password" icon={KeyRound}>
          <form onSubmit={changePassword} className="space-y-4">
            <Field label="Current password" id="pw-current" error={pwErrors.current_password?.[0]}>
              <input id="pw-current" name="current_password" type="password" autoComplete="current-password" className={inputClass} />
            </Field>
            <Field label="New password (10+ characters, letters and numbers)" id="pw-new" error={pwErrors.password?.[0]}>
              <input id="pw-new" name="password" type="password" minLength={10} required autoComplete="new-password" className={inputClass} />
            </Field>
            <Field label="Confirm new password" id="pw-confirm">
              <input id="pw-confirm" name="password_confirmation" type="password" minLength={10} required autoComplete="new-password" className={inputClass} />
            </Field>
            {pwMsg && <p role="status" className="text-sm text-green-700">{pwMsg}</p>}
            <button className="rounded-full border border-brand-red px-6 py-2.5 font-semibold text-brand-red hover:bg-brand-red/5">Update password</button>
          </form>
        </Card>
      </div>
    </AccountLayout>
  );
}
