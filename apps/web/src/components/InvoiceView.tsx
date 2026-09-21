"use client";

import { useEffect, useState } from "react";
import type { Invoice } from "@/lib/api";
import { apiFetch } from "@/lib/client-api";
import { formatDate, formatINR } from "@/lib/format";
import { site } from "@/lib/site";
import { RequireAuth } from "./RequireAuth";

export function InvoiceView({ reference }: { reference: string }) {
  return (
    <RequireAuth>
      <Inner reference={reference} />
    </RequireAuth>
  );
}

function Inner({ reference }: { reference: string }) {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Invoice }>(`bookings/${reference}/invoice`).then((r) => setInv(r.data)).catch(() => setMissing(true));
  }, [reference]);

  if (missing) return <p className="p-16 text-center text-muted">Invoice not found.</p>;
  if (!inv) return <p className="p-16 text-center text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <button onClick={() => window.print()} className="rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark">Print / Save as PDF</button>
      </div>

      <article className="space-y-8 rounded-card border border-black/10 p-8 print:border-0">
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-red">TAX INVOICE</h1>
            <p className="text-sm text-muted">{inv.invoice_number}</p>
            <p className="text-sm text-muted">Date: {formatDate(inv.issued_on)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">{site.name}</p>
            <p className="text-muted">{site.address}</p>
            <p className="text-muted">{site.email}</p>
            <p className="text-xs text-muted">GSTIN: to be added</p>
          </div>
        </header>

        <section className="text-sm">
          <h2 className="mb-1 font-bold">Billed to</h2>
          <p>{inv.bill_to.name}</p>
          <p className="text-muted">{inv.bill_to.email} · {inv.bill_to.phone}</p>
          <p className="text-muted">Place of supply: {inv.bill_to.state}</p>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/20 text-left">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black/10">
              <td className="py-3">{inv.line.description}<br /><span className="text-xs text-muted">Departure {formatDate(inv.line.departure)} · Ref {inv.reference}</span></td>
              <td className="py-3 text-right">{inv.line.quantity}</td>
              <td className="py-3 text-right">{formatINR(inv.line.unit_price)}</td>
              <td className="py-3 text-right">{formatINR(inv.line.amount)}</td>
            </tr>
          </tbody>
        </table>

        <dl className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(inv.line.amount)}</dd></div>
          {inv.tax.type === "CGST+SGST" ? (
            <>
              <div className="flex justify-between"><dt>CGST ({inv.tax.rate_percent / 2}%)</dt><dd>{formatINR(inv.tax.cgst)}</dd></div>
              <div className="flex justify-between"><dt>SGST ({inv.tax.rate_percent / 2}%)</dt><dd>{formatINR(inv.tax.sgst)}</dd></div>
            </>
          ) : (
            <div className="flex justify-between"><dt>IGST ({inv.tax.rate_percent}%)</dt><dd>{formatINR(inv.tax.igst)}</dd></div>
          )}
          <div className="flex justify-between border-t border-black/20 pt-2 text-base font-extrabold"><dt>Total</dt><dd>{formatINR(inv.total)}</dd></div>
          {inv.credit_applied > 0 && <div className="flex justify-between text-green-700"><dt>Paid by credit note</dt><dd>{formatINR(inv.credit_applied)}</dd></div>}
          <div className="flex justify-between text-green-700"><dt>Total paid</dt><dd>{formatINR(inv.paid)}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd>{formatINR(inv.balance)}</dd></div>
        </dl>
      </article>
    </div>
  );
}
