"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Booking, CancellationPreview } from "@/lib/api";
import { ApiError, apiFetch } from "@/lib/client-api";
import { formatINR } from "@/lib/format";
import { useApi } from "@/lib/use-api";

export function CancelBookingDialog({ booking, onClose, onCancelled }: { booking: Booking; onClose: () => void; onCancelled: (b: Booking) => void }) {
  const preview = useApi<{ data: CancellationPreview }>(`bookings/${booking.reference}/cancellation`);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = preview.data?.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Booking }>(`bookings/${booking.reference}/cancel`, { body: { confirm: true } });
      onCancelled(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? (e.first("booking") ?? e.message) : "Could not cancel. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="cancel-h" className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1 text-muted hover:bg-surface-alt"><X size={20} /></button>
        <h2 id="cancel-h" className="pr-8 text-2xl font-extrabold">Cancel booking?</h2>
        <p className="mt-1 text-sm text-muted">{booking.tour.title} · {booking.reference}</p>

        {preview.loading && <p className="mt-6 text-muted">Calculating…</p>}
        {preview.error && <p className="mt-6 text-brand-red">Could not load cancellation details.</p>}

        {p && !p.can_cancel && <p className="mt-6 rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{p.reason}</p>}

        {p?.can_cancel && (
          <>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Departs in</dt><dd>{p.days_before_departure} days</dd></div>
              <div className="flex justify-between"><dt>Amount paid</dt><dd>{formatINR(p.paid)}</dd></div>
              <div className="flex justify-between text-brand-red"><dt>Cancellation charges{p.tier_percent ? ` (${p.tier_percent}% tier)` : " (booking advance)"}</dt><dd>− {formatINR(p.deduction)}</dd></div>
              <div className="flex justify-between border-t border-black/10 pt-2 text-base font-extrabold"><dt>{p.outcome === "credit_note" ? "Credit note issued" : "Refund requested"}</dt><dd>{formatINR(p.returnable)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              {p.outcome === "credit_note"
                ? "The returnable amount is issued as a credit note valid for 12 months, usable in full on one booking. GST already charged is included in these figures."
                : "The returnable amount is refunded to your original payment method after review."}
            </p>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-brand-red" />
              I understand this cannot be undone and my seats will be released.
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-brand-red">{error}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={confirm} disabled={!agreed || busy} className="flex-1 rounded-full bg-brand-red px-5 py-3 font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50">{busy ? "Cancelling…" : "Cancel booking"}</button>
              <button onClick={onClose} className="rounded-full border border-black/20 px-5 py-3 font-semibold">Keep it</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
