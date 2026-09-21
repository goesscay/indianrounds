"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Booking } from "@/lib/api";
import { ApiError, apiFetch } from "@/lib/client-api";
import { can, useAuth } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { field, ghostBtn, Labeled, Modal, Pager, primaryBtn, Status, Table, Title, useList } from "./ui";

type BookingRow = { reference: string; status: string; tour: string; departure: string; traveller_count: number; total_amount: number; contact_name: string; contact_email: string; created_at: string };

export function BookingsAdminList() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const list = useList<BookingRow>("bookings", { status, q });
  const router = useRouter();

  return (
    <>
      <Title title="Bookings" />
      <div className="mb-4 flex flex-wrap gap-3">
        <input aria-label="Search bookings" placeholder="Reference, name, email, phone…" value={q} onChange={(e) => { setQ(e.target.value); list.setPage(1); }} className={`${field} max-w-xs`} />
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); list.setPage(1); }} className={`${field} max-w-[12rem]`}>
          <option value="">All statuses</option>
          {["confirmed", "pending_payment", "cancelled", "expired"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>
      <Table
        loading={list.loading}
        rows={list.rows}
        onRow={(r) => router.push(`/admin/bookings/${r.reference}`)}
        cols={[
          { header: "Reference", render: (r) => <span className="font-mono font-semibold">{r.reference}</span> },
          { header: "Tour", render: (r) => r.tour },
          { header: "Customer", render: (r) => <>{r.contact_name}<br /><span className="text-xs text-muted">{r.contact_email}</span></> },
          { header: "Departs", render: (r) => formatDate(r.departure) },
          { header: "Pax", render: (r) => r.traveller_count },
          { header: "Total", render: (r) => formatINR(r.total_amount) },
          { header: "Status", render: (r) => <Status value={r.status} /> },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
    </>
  );
}

type Detail = { booking: Booking; customer: { id: number; name: string; email: string; phone: string | null }; refunds: { id: number; amount: number; status: string; reference: string | null }[]; credit_notes: { id: number; code: string; amount: number; status: string; expires_on: string }[] };

export function BookingAdminDetail({ reference }: { reference: string }) {
  const { data, loading, error } = useApi<{ data: Detail }>(`admin/bookings/${reference}`);
  if (loading) return <p className="text-muted">Loading…</p>;
  if (error || !data) return <p className="text-muted">Booking not found.</p>;
  const { booking: b, customer, refunds, credit_notes } = data.data;

  return (
    <>
      <Link href="/admin/bookings" className="text-sm font-semibold text-brand-red">← All bookings</Link>
      <Title title={b.tour.title} sub={`${b.reference} · departs ${formatDate(b.departure.starts_on)}`} action={<Status value={b.status} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-extrabold">Customer</h2>
          <p>{customer.name}</p>
          <p className="text-sm text-muted">{customer.email} · {customer.phone ?? "no phone"}</p>
          <p className="mt-2 text-sm">Lead traveller contact: {b.contact.name}, {b.contact.phone}</p>
          <h2 className="mb-2 mt-5 font-extrabold">Travellers ({b.traveller_count})</h2>
          <ul className="list-inside list-disc text-sm text-muted">{b.travellers.map((t, i) => <li key={i}>{t.name}{t.age ? `, ${t.age}` : ""}</li>)}</ul>
        </section>
        <section className="rounded-card bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-extrabold">Money</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(b.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>GST ({b.gst_rate * 100}%) · {b.gst_state}</dt><dd>{formatINR(b.gst_amount)}</dd></div>
            <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatINR(b.total_amount)}</dd></div>
            <div className="flex justify-between text-green-700"><dt>Paid{b.credit_applied ? ` (incl. ${formatINR(b.credit_applied)} credit note)` : ""}</dt><dd>{formatINR(b.paid_amount)}</dd></div>
          </dl>
          <h2 className="mb-2 mt-5 font-extrabold">Payment schedule</h2>
          <ul className="space-y-1 text-sm">
            {b.milestones.map((m) => <li key={m.id} className="flex justify-between"><span>{m.label} · {formatDate(m.due_on)}</span><span>{formatINR(m.amount)} <Status value={m.status} /></span></li>)}
            {b.milestones.length === 0 && <li className="text-muted">No open instalments.</li>}
          </ul>
        </section>
        {(refunds.length > 0 || credit_notes.length > 0) && (
          <section className="rounded-card bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-2 font-extrabold">Cancellation outcomes</h2>
            <ul className="space-y-1 text-sm">
              {refunds.map((r) => <li key={r.id}>Refund {formatINR(r.amount)} — <Status value={r.status} /> {r.reference && `(${r.reference})`}</li>)}
              {credit_notes.map((c) => <li key={c.id}>Credit note <span className="font-mono">{c.code}</span> {formatINR(c.amount)} — <Status value={c.status} /></li>)}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

type PaymentRow = { id: number; booking: string; customer: string; label: string; amount: number; payment_id: string | null; paid_at: string | null };

export function PaymentsView() {
  const list = useList<PaymentRow>("payments");
  return (
    <>
      <Title title="Payments" sub="Successful payments, newest first" />
      <Table
        loading={list.loading}
        rows={list.rows}
        cols={[
          { header: "Paid", render: (r) => r.paid_at?.slice(0, 16).replace("T", " ") ?? "—" },
          { header: "Booking", render: (r) => <Link className="font-mono text-brand-red" href={`/admin/bookings/${r.booking}`}>{r.booking}</Link> },
          { header: "Customer", render: (r) => r.customer },
          { header: "For", render: (r) => r.label },
          { header: "Amount", render: (r) => <strong>{formatINR(r.amount)}</strong> },
          { header: "Gateway ref", render: (r) => <span className="font-mono text-xs">{r.payment_id}</span> },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
    </>
  );
}

type RefundRow = { id: number; booking: string; amount: number; status: string; reference: string | null; notes: string | null; created_at: string };

export function RefundsView() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const list = useList<RefundRow>("refunds", { status });
  const [acting, setActing] = useState<{ r: RefundRow; mode: "process" | "reject" } | null>(null);
  const act = can(user, "refunds.process");

  return (
    <>
      <Title title="Refunds" sub="Requests created when cash-refund mode is on. Payments above the staff limit go to an Admin for approval." />
      <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); list.setPage(1); }} className={`${field} mb-4 max-w-[12rem]`}>
        <option value="">All statuses</option>
        {["pending", "pending_approval", "processed", "rejected"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
      </select>
      <Table
        loading={list.loading}
        rows={list.rows}
        cols={[
          { header: "Booking", render: (r) => <span className="font-mono">{r.booking}</span> },
          { header: "Amount", render: (r) => <strong>{formatINR(r.amount)}</strong> },
          { header: "Status", render: (r) => <Status value={r.status} /> },
          { header: "Reference", render: (r) => r.reference ?? r.notes ?? "—" },
          { header: "Raised", render: (r) => r.created_at.slice(0, 10) },
          { header: "", render: (r) => act && r.status === "pending" ? (
            <span className="flex gap-3"><button onClick={() => setActing({ r, mode: "process" })} className="font-semibold text-brand-red">Process</button><button onClick={() => setActing({ r, mode: "reject" })} className="text-muted hover:text-brand-red">Reject</button></span>
          ) : null },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
      {acting && <RefundModal r={acting.r} mode={acting.mode} onClose={() => setActing(null)} onDone={() => { setActing(null); list.reload(); }} />}
    </>
  );
}

function RefundModal({ r, mode, onClose, onDone }: { r: RefundRow; mode: "process" | "reject"; onClose: () => void; onDone: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const v = String(new FormData(e.currentTarget).get("v") ?? "");
    try {
      const res = await apiFetch<{ message: string; approval_required?: boolean }>(`admin/refunds/${r.id}/${mode}`, { body: mode === "process" ? { reference: v } : { notes: v } });
      if (res.approval_required) {
        setInfo(res.message);
        setBusy(false);
        return;
      }
      onDone();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? (Object.values(e2.errors)[0]?.[0] ?? e2.message) : "Failed.");
      setBusy(false);
    }
  }

  if (info) {
    return (
      <Modal title="Sent for approval" onClose={onDone}>
        <p className="text-sm">{info}</p>
        <button onClick={onDone} className={`${primaryBtn} mt-4`}>OK</button>
      </Modal>
    );
  }

  return (
    <Modal title={`${mode === "process" ? "Process" : "Reject"} refund of ${formatINR(r.amount)}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Labeled label={mode === "process" ? "Bank / gateway reference *" : "Reason *"} id="rf-v"><input id="rf-v" name="v" required className={field} /></Labeled>
        {mode === "process" && <p className="text-xs text-muted">Record the payout reference after sending the money. This does not move money by itself.</p>}
        {err && <p role="alert" className="text-sm text-brand-red">{err}</p>}
        <div className="flex gap-3"><button disabled={busy} className={primaryBtn}>Confirm</button><button type="button" onClick={onClose} className={ghostBtn}>Cancel</button></div>
      </form>
    </Modal>
  );
}

type CreditRow = { id: number; code: string; amount: number; status: string; issued_on: string; expires_on: string; booking: string; customer: string };

export function CreditNotesAdmin() {
  const { user } = useAuth();
  const list = useList<CreditRow>("credit-notes");
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function issue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      const res = await apiFetch<{ message: string }>("admin/credit-notes", { body: { booking_reference: f.booking_reference.trim(), amount: Number(f.amount), reason: f.reason } });
      setInfo(res.message);
      setOpen(false);
      list.reload();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? (Object.values(e2.errors)[0]?.[0] ?? e2.message) : "Failed.");
    }
    setBusy(false);
  }

  return (
    <>
      <Title title="Credit notes" action={can(user, "credit_notes.issue") && <button onClick={() => setOpen(true)} className={primaryBtn}>Issue credit note</button>} />
      {info && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{info}</p>}
      <Table
        loading={list.loading}
        rows={list.rows}
        cols={[
          { header: "Code", render: (r) => <span className="font-mono font-semibold">{r.code}</span> },
          { header: "Amount", render: (r) => formatINR(r.amount) },
          { header: "Customer", render: (r) => r.customer },
          { header: "From booking", render: (r) => <span className="font-mono">{r.booking}</span> },
          { header: "Expires", render: (r) => formatDate(r.expires_on) },
          { header: "Status", render: (r) => <Status value={r.status} /> },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
      {open && (
        <Modal title="Issue a credit note" onClose={() => setOpen(false)}>
          <form onSubmit={issue} className="space-y-4">
            <Labeled label="Booking reference *" id="cn-ref"><input id="cn-ref" name="booking_reference" required className={field} placeholder="IR…" /></Labeled>
            <Labeled label="Amount (₹) *" id="cn-amt"><input id="cn-amt" name="amount" type="number" min={1} required className={field} /></Labeled>
            <Labeled label="Reason *" id="cn-reason"><input id="cn-reason" name="reason" required className={field} /></Labeled>
            <p className="text-xs text-muted">Amounts above the staff limit are sent to an Admin for approval.</p>
            {err && <p role="alert" className="text-sm text-brand-red">{err}</p>}
            <button disabled={busy} className={primaryBtn}>Issue</button>
          </form>
        </Modal>
      )}
    </>
  );
}

type Approval = { id: number; type: string; summary: string; amount: number; status: string; requested_by: string; department: string | null; decided_by: string | null; decision_note: string | null; created_at: string; can_decide: boolean };

export function ApprovalsView() {
  const [status, setStatus] = useState("pending");
  const list = useList<Approval>("approvals", { status });
  const [deciding, setDeciding] = useState<{ a: Approval; approve: boolean } | null>(null);

  return (
    <>
      <Title title="Approvals" sub="Requests above a staff member’s limit wait here for a department Admin" />
      <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); list.setPage(1); }} className={`${field} mb-4 max-w-[12rem]`}>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="">All</option>
      </select>
      <Table
        loading={list.loading}
        rows={list.rows}
        empty="No requests."
        cols={[
          { header: "Request", render: (r) => <>{r.summary}<br /><span className="text-xs text-muted">by {r.requested_by} · {r.created_at.slice(0, 10)}</span></> },
          { header: "Amount", render: (r) => <strong>{formatINR(r.amount)}</strong> },
          { header: "Status", render: (r) => <><Status value={r.status} />{r.decided_by && <span className="ml-2 text-xs text-muted">{r.decided_by}{r.decision_note ? `: ${r.decision_note}` : ""}</span>}</> },
          { header: "", render: (r) => r.can_decide ? (
            <span className="flex gap-3"><button onClick={() => setDeciding({ a: r, approve: true })} className="font-semibold text-brand-red">Approve</button><button onClick={() => setDeciding({ a: r, approve: false })} className="text-muted hover:text-brand-red">Reject</button></span>
          ) : null },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
      {deciding && <DecideModal d={deciding} onClose={() => setDeciding(null)} onDone={() => { setDeciding(null); list.reload(); }} />}
    </>
  );
}

function DecideModal({ d, onClose, onDone }: { d: { a: Approval; approve: boolean }; onClose: () => void; onDone: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const note = String(new FormData(e.currentTarget).get("note") ?? "");
    try {
      await apiFetch(`admin/approvals/${d.a.id}/decide`, { body: { approve: d.approve, note: note || undefined } });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? (Object.values(e2.errors)[0]?.[0] ?? e2.message) : "Failed.");
      setBusy(false);
    }
  }

  return (
    <Modal title={`${d.approve ? "Approve" : "Reject"}: ${formatINR(d.a.amount)}`} onClose={onClose}>
      <p className="mb-4 text-sm text-muted">{d.a.summary}</p>
      <form onSubmit={submit} className="space-y-4">
        <Labeled label={d.approve ? "Note (optional)" : "Reason"} id="ap-note"><input id="ap-note" name="note" className={field} required={!d.approve} /></Labeled>
        {err && <p role="alert" className="text-sm text-brand-red">{err}</p>}
        <div className="flex gap-3"><button disabled={busy} className={primaryBtn}>{d.approve ? "Approve" : "Reject"}</button><button type="button" onClick={onClose} className={ghostBtn}>Cancel</button></div>
      </form>
    </Modal>
  );
}
