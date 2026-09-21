"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import type { Booking, CreditNote, Tour } from "@/lib/api";
import { ApiError, apiFetch } from "@/lib/client-api";
import { useAuth } from "@/lib/auth";
import { durationLabel, formatDate, formatINR } from "@/lib/format";
import { Field, inputClass } from "./AuthShell";
import { MilestoneList } from "./MilestoneList";

type Traveller = { name?: string; age: string; gender: string };
type Contact = { name?: string; phone?: string; email?: string };
type Draft = { key: string; contact: Required<Contact>; gst_state: string; travellers: (Traveller & { name: string })[] };

const DRAFT = "ir_checkout_draft";
const GST = 0.05;
const blank = (): Traveller => ({ age: "", gender: "" });

const useIsClient = () => useSyncExternalStore(() => () => {}, () => true, () => false);

function readDraft(key: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT);
    const d = raw ? (JSON.parse(raw) as Draft) : null;
    return d && d.key === key ? d : null;
  } catch {
    return null;
  }
}

function Steps({ step }: { step: "details" | "payment" | "done" }) {
  const items = [
    ["details", "Booking details"],
    ["payment", "Payment"],
    ["done", "Confirmation"],
  ] as const;
  const idx = items.findIndex(([k]) => k === step);
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm font-semibold sm:gap-4">
      {items.map(([k, label], i) => (
        <li key={k} className="flex items-center gap-2">
          <span className={`grid size-7 place-items-center rounded-full text-xs ${i <= idx ? "bg-brand-red text-white" : "bg-surface-alt text-muted"}`}>{i + 1}</span>
          <span className={i <= idx ? "" : "text-muted"}>{label}</span>
          {i < items.length - 1 && <span className="mx-1 hidden h-px w-8 bg-black/15 sm:block" />}
        </li>
      ))}
    </ol>
  );
}

export function CheckoutWizard() {
  const isClient = useIsClient();
  return isClient ? <CheckoutInner /> : <p className="p-16 text-center text-muted">Loading…</p>;
}

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const slug = params.get("tour") ?? "";
  const batchId = Number(params.get("batch") ?? 0);
  const variantId = params.get("variant") ? Number(params.get("variant")) : null;
  const paxParam = Math.min(10, Math.max(1, Number(params.get("pax") ?? 1) || 1));
  const ref = params.get("ref");
  const resume = params.get("resume") === "1";
  const key = `${slug}|${batchId}|${variantId ?? ""}`;

  const [tour, setTour] = useState<Tour | null>(null);
  const [tourError, setTourError] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [draft] = useState(() => readDraft(key));
  // `undefined` = untouched, so account details show through without syncing state in an effect.
  const [contactEdits, setContactEdits] = useState<Contact>(() => draft?.contact ?? {});
  const [gstEdit, setGstEdit] = useState<string | undefined>(() => draft?.gst_state);
  const [travellerEdits, setTravellerEdits] = useState<Traveller[]>(() => draft?.travellers ?? Array.from({ length: paxParam }, blank));
  const [booking, setBooking] = useState<Booking | null>(null);
  const [step, setStep] = useState<"details" | "payment" | "done">("details");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(resume && !ref && !!draft);
  const autoStarted = useRef(false);
  const [notes, setNotes] = useState<CreditNote[] | null>(null);
  const [creditId, setCreditId] = useState<number | null>(null);
  const [continued, setContinued] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const stuckResume = resume && !authLoading && !user;
  const holdForCredit = resume && !continued && notes !== null && notes.length > 0;
  const isBusy = busy && !stuckResume && !holdForCredit;

  // Load tour + states
  useEffect(() => {
    if (!slug) return;
    apiFetch<{ data: Tour }>(`tours/${encodeURIComponent(slug)}`).then((r) => setTour(r.data)).catch(() => setTourError(true));
    apiFetch<{ data: string[] }>("meta/states").then((r) => setStates(r.data)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const contact = {
    name: contactEdits.name ?? user?.name ?? "",
    phone: contactEdits.phone ?? user?.phone ?? "",
    email: contactEdits.email ?? user?.email ?? "",
  };
  const gstState = gstEdit ?? user?.gst_state ?? "";
  const travellers = travellerEdits.map((t, i) => ({ ...t, name: t.name ?? (i === 0 ? (user?.name ?? "") : "") }));

  // Usable credit notes for this customer
  useEffect(() => {
    if (!user) return;
    let alive = true;
    apiFetch<{ data: CreditNote[] }>("me/credit-notes")
      .then((r) => alive && setNotes(r.data.filter((n) => n.status === "active")))
      .catch(() => alive && setNotes([]));
    return () => {
      alive = false;
    };
  }, [user]);

  // Resume an existing booking (page refresh, or return from Pay later)
  useEffect(() => {
    if (!ref || !user) return;
    apiFetch<{ data: Booking }>(`bookings/${ref}`)
      .then((r) => {
        setBooking(r.data);
        setStep(r.data.status === "confirmed" ? "done" : "payment");
      })
      .catch(() => router.replace(`/checkout?tour=${slug}&batch=${batchId}${variantId ? `&variant=${variantId}` : ""}&pax=${paxParam}`));
  }, [ref, user, router, slug, batchId, variantId, paxParam]);

  const unit = useMemo(() => {
    const v = tour?.variants?.find((x) => x.id === variantId);
    return v?.price ?? tour?.price ?? 0;
  }, [tour, variantId]);
  const variantLabel = tour?.variants?.find((x) => x.id === variantId)?.label;
  const batch = tour?.batches?.find((b) => b.id === batchId);
  const subtotal = unit * travellers.length;
  const gst = Math.round(subtotal * GST);

  const createBooking = useCallback(
    (t: { name: string; age: string; gender: string }[], c: Required<Contact>, state: string, credit: number | null) =>
      apiFetch<{ data: Booking }>("bookings", {
        body: {
          tour_slug: slug,
          batch_id: batchId,
          variant_id: variantId ?? undefined,
          credit_note_id: credit ?? undefined,
          gst_state: state,
          contact: c,
          travellers: t.map((x) => ({ name: x.name, age: x.age ? Number(x.age) : undefined, gender: x.gender || undefined })),
        },
      })
        .then((res) => {
          sessionStorage.removeItem(DRAFT);
          setBooking(res.data);
          setStep(res.data.status === "confirmed" ? "done" : "payment");
          router.replace(`/checkout?tour=${slug}&batch=${batchId}${variantId ? `&variant=${variantId}` : ""}&pax=${t.length}&ref=${res.data.reference}`);
        })
        .catch((e) => {
          if (e instanceof ApiError) {
            setErrors(e.errors);
            setMessage(e.first("batch_id") ?? e.first("variant_id") ?? e.first("credit_note_id") ?? e.message);
          } else setMessage("Could not create the booking. Please try again.");
          setStep("details");
        })
        .finally(() => setBusy(false)),
    [slug, batchId, variantId, router],
  );

  // After the login redirect: continue straight to payment with the saved details
  useEffect(() => {
    if (!resume || autoStarted.current || authLoading || !user || ref || !draft || notes === null || notes.length > 0) return;
    autoStarted.current = true;
    void createBooking(draft.travellers, draft.contact, draft.gst_state, null);
  }, [resume, authLoading, user, ref, draft, notes, createBooking]);

  function setTraveller(i: number, patch: Partial<Traveller>) {
    setTravellerEdits((t) => t.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  function resize(n: number) {
    setTravellerEdits((t) => (n > t.length ? [...t, ...Array.from({ length: n - t.length }, blank)] : t.slice(0, n)));
  }

  async function onContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const seatsLeft = batch?.seats_left ?? 10;
    if (travellers.length > seatsLeft) {
      setMessage(`Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left on this departure.`);
      return;
    }
    const toSave: Draft = { key, contact, gst_state: gstState, travellers };
    sessionStorage.setItem(DRAFT, JSON.stringify(toSave));

    if (!user) {
      const back = `/checkout?tour=${slug}&batch=${batchId}${variantId ? `&variant=${variantId}` : ""}&pax=${travellers.length}&resume=1`;
      router.push(`/login?next=${encodeURIComponent(back)}`);
      return;
    }
    setContinued(true);
    setBusy(true);
    setErrors({});
    setMessage(null);
    await createBooking(travellers, contact, gstState, creditId);
  }

  const onPaid = (b: Booking) => {
    setBooking(b);
    if (b.status === "confirmed") setStep("done");
  };

  if (!slug || !batchId) {
    return (
      <div className="p-16 text-center">
        <p className="font-semibold">Choose a tour and departure date first.</p>
        <Link href="/tours" className="mt-3 inline-block text-brand-red underline">Browse tours</Link>
      </div>
    );
  }
  if (tourError) return <p className="p-16 text-center text-muted">We could not load this tour.</p>;
  if (!tour) return <p className="p-16 text-center text-muted">Loading…</p>;

  const minutesLeft = booking?.reserved_until ? Math.max(0, Math.round((new Date(booking.reserved_until).getTime() - now) / 60000)) : null;
  const err = (k: string) => errors[k]?.[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Steps step={step} />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          {step === "details" && (
            <form onSubmit={onContinue} className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-extrabold">Lead traveller</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name *" id="c-name" error={err("contact.name")}>
                    <input id="c-name" required value={contact.name} onChange={(e) => setContactEdits({ ...contactEdits, name: e.target.value })} className={inputClass} autoComplete="name" />
                  </Field>
                  <Field label="Mobile number *" id="c-phone" error={err("contact.phone")}>
                    <input id="c-phone" required inputMode="numeric" placeholder="9876543210" value={contact.phone} onChange={(e) => setContactEdits({ ...contactEdits, phone: e.target.value })} className={inputClass} autoComplete="tel-national" />
                  </Field>
                  <Field label="Email *" id="c-email" error={err("contact.email")}>
                    <input id="c-email" type="email" required value={contact.email} onChange={(e) => setContactEdits({ ...contactEdits, email: e.target.value })} className={inputClass} autoComplete="email" />
                  </Field>
                  <Field label="GST state *" id="c-state" error={err("gst_state")}>
                    <select id="c-state" required value={gstState} onChange={(e) => setGstEdit(e.target.value)} className={inputClass}>
                      <option value="">Select your state</option>
                      {states.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <p className="text-xs text-muted">GST state is your billing state. It decides whether your invoice shows CGST + SGST or IGST.</p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold">Travellers</h2>
                  <div className="flex items-center gap-3" role="group" aria-label="Number of travellers">
                    <button type="button" aria-label="Fewer travellers" disabled={travellers.length <= 1} onClick={() => resize(travellers.length - 1)} className="grid size-8 place-items-center rounded-full border border-black/20 disabled:opacity-40"><Minus size={16} /></button>
                    <span className="w-6 text-center font-bold">{travellers.length}</span>
                    <button type="button" aria-label="More travellers" disabled={travellers.length >= 10} onClick={() => resize(travellers.length + 1)} className="grid size-8 place-items-center rounded-full border border-black/20 disabled:opacity-40"><Plus size={16} /></button>
                  </div>
                </div>
                {travellers.map((t, i) => (
                  <div key={i} className="grid gap-3 rounded-card border border-black/10 p-4 sm:grid-cols-[1fr_6rem_9rem]">
                    <Field label={`Traveller ${i + 1} name *`} id={`t-name-${i}`} error={err(`travellers.${i}.name`)}>
                      <input id={`t-name-${i}`} required value={t.name} onChange={(e) => setTraveller(i, { name: e.target.value })} className={inputClass} placeholder="As on ID proof" />
                    </Field>
                    <Field label="Age" id={`t-age-${i}`}>
                      <input id={`t-age-${i}`} type="number" min={0} max={120} value={t.age} onChange={(e) => setTraveller(i, { age: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Gender" id={`t-gender-${i}`}>
                      <select id={`t-gender-${i}`} value={t.gender} onChange={(e) => setTraveller(i, { gender: e.target.value })} className={inputClass}>
                        <option value="">—</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                  </div>
                ))}
              </section>

              {notes && notes.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-xl font-extrabold">Use a credit note</h2>
                  <p className="text-xs text-muted">A credit note is used in full on one booking and must not exceed the booking total.</p>
                  <label className="flex items-center gap-3 rounded-card border border-black/10 p-3 text-sm">
                    <input type="radio" name="credit" checked={creditId === null} onChange={() => setCreditId(null)} className="accent-brand-red" /> Don&apos;t use a credit note
                  </label>
                  {notes.map((n) => (
                    <label key={n.id} className="flex items-center justify-between gap-3 rounded-card border border-black/10 p-3 text-sm">
                      <span className="flex items-center gap-3">
                        <input type="radio" name="credit" checked={creditId === n.id} onChange={() => setCreditId(n.id)} className="accent-brand-red" />
                        <span><span className="font-mono font-bold">{n.code}</span><span className="block text-xs text-muted">expires {formatDate(n.expires_on)}</span></span>
                      </span>
                      <strong>{formatINR(n.amount)}</strong>
                    </label>
                  ))}
                </section>
              )}

              {message && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{message}</p>}

              <div>
                <button disabled={isBusy || authLoading} className="rounded-full bg-brand-red px-8 py-3 font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60">
                  {isBusy ? "Reserving seats…" : user ? "Continue to payment" : "Continue — log in to pay"}
                </button>
                {!user && !authLoading && <p className="mt-2 text-xs text-muted">You will be asked to log in or create an account before payment. Your details are kept.</p>}
              </div>
            </form>
          )}

          {step === "payment" && booking && (
            <section className="space-y-5">
              <h2 className="text-xl font-extrabold">Payment</h2>
              {booking.status === "expired" ? (
                <div className="rounded-card bg-brand-red/10 p-5">
                  <p className="font-semibold text-brand-red">Your seat reservation expired.</p>
                  <Link href={`/tours/${slug}/dates`} className="mt-2 inline-block text-brand-red underline">Choose a date again</Link>
                </div>
              ) : (
                <>
                  {minutesLeft !== null && booking.status === "pending_payment" && (
                    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Your seats are held for about {minutesLeft} more minute{minutesLeft === 1 ? "" : "s"}. Pay the booking advance to confirm.</p>
                  )}
                  <p className="text-sm text-muted">Pay in instalments: the first payment confirms your booking. Remaining amounts are due on the dates below.</p>
                  <MilestoneList booking={booking} onPaid={onPaid} />
                </>
              )}
            </section>
          )}

          {step === "done" && booking && (
            <section className="space-y-5 text-center sm:text-left">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <CheckCircle2 className="shrink-0 text-green-600" size={48} />
                <div>
                  <h2 className="text-2xl font-extrabold">Booking confirmed!</h2>
                  <p className="text-muted">Reference <strong className="text-ink">{booking.reference}</strong>. A confirmation has been emailed to {booking.contact.email}.</p>
                </div>
              </div>
              <MilestoneList booking={booking} onPaid={onPaid} />
              <div className="flex flex-wrap gap-3">
                <Link href={`/bookings/${booking.reference}`} className="rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark">View booking</Link>
                <Link href={`/bookings/${booking.reference}/invoice`} className="rounded-full border border-brand-red px-6 py-3 font-semibold text-brand-red">Invoice</Link>
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit rounded-card border border-black/10 p-5 lg:sticky lg:top-28">
          <h2 className="font-extrabold">Order summary</h2>
          <p className="mt-3 font-semibold">{tour.title}</p>
          <p className="text-sm text-muted">{durationLabel(tour.duration_nights, tour.duration_days)}</p>
          {batch && <p className="text-sm text-muted">Departs {formatDate(batch.starts_on)}</p>}
          {variantLabel && <p className="text-sm text-muted">{variantLabel}</p>}
          <dl className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between"><dt>{formatINR(booking?.unit_price ?? unit)} × {booking?.traveller_count ?? travellers.length}</dt><dd>{formatINR(booking?.subtotal ?? subtotal)}</dd></div>
            <div className="flex justify-between"><dt>GST (5%)</dt><dd>{formatINR(booking?.gst_amount ?? gst)}</dd></div>
            {!booking && creditId !== null && <div className="flex justify-between text-green-700"><dt>Credit note</dt><dd>− {formatINR(notes?.find((n) => n.id === creditId)?.amount ?? 0)}</dd></div>}
            {booking && booking.credit_applied > 0 && <div className="flex justify-between text-green-700"><dt>Credit note</dt><dd>− {formatINR(booking.credit_applied)}</dd></div>}
            <div className="flex justify-between border-t border-black/10 pt-2 text-base font-extrabold"><dt>Total</dt><dd className="text-brand-red">{formatINR(booking?.total_amount ?? subtotal + gst)}</dd></div>
            {booking && <div className="flex justify-between text-green-700"><dt>Paid</dt><dd>{formatINR(booking.paid_amount)}</dd></div>}
          </dl>
        </aside>
      </div>
    </div>
  );
}
