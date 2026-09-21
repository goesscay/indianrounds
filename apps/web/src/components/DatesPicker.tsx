"use client";

import { useMemo, useState } from "react";
import type { Batch, Variant } from "@/lib/api";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { useLeadModal } from "./LeadModal";

type Props = { tourTitle: string; destination?: string; batches: Batch[]; variants: Variant[]; basePrice: number };

export function DatesPicker({ tourTitle, destination, batches, variants, basePrice }: Props) {
  const { open } = useLeadModal();
  const [batchId, setBatchId] = useState<number | null>(null);
  const [variantId, setVariantId] = useState<number | null>(variants[0]?.id ?? null);

  const byMonth = useMemo(() => {
    const groups = new Map<string, Batch[]>();
    for (const b of batches) {
      const key = b.starts_on.slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), b]);
    }
    return [...groups.entries()];
  }, [batches]);

  const batch = batches.find((b) => b.id === batchId);
  const variant = variants.find((v) => v.id === variantId);
  const price = variant?.price ?? basePrice;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="dates-h" className="rounded-card border border-black/10 p-5">
        <h2 id="dates-h" className="mb-4 text-lg font-extrabold">Available dates</h2>
        {byMonth.length === 0 && <p className="text-sm text-muted">No departures are scheduled. Request a custom date instead.</p>}
        <div className="space-y-5">
          {byMonth.map(([month, list]) => (
            <div key={month}>
              <h3 className="mb-2 rounded-lg bg-brand-red/10 px-3 py-2 text-sm font-bold text-brand-red">{formatMonth(`${month}-01`)}</h3>
              <ul className="space-y-2">
                {list.map((b) => {
                  const soldOut = b.status === "sold_out";
                  const selected = b.id === batchId;
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        disabled={soldOut}
                        aria-pressed={selected}
                        onClick={() => setBatchId(b.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                          soldOut ? "cursor-not-allowed border-black/10 bg-surface-alt text-muted" : selected ? "border-brand-red bg-brand-red/5 ring-2 ring-brand-red/30" : "border-black/15 hover:border-brand-red"
                        }`}
                      >
                        <span className="font-medium">{formatDate(b.starts_on)} – {formatDate(b.ends_on)}</span>
                        <span className={`text-xs font-semibold ${soldOut ? "" : b.seats_left <= 4 ? "text-brand-red" : "text-green-700"}`}>
                          {soldOut ? "Sold out" : b.seats_left <= 4 ? `${b.seats_left} seats left` : "Open"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="cost-h" className="space-y-4">
        <div className="rounded-card border border-black/10 p-5">
          <h2 id="cost-h" className="mb-4 text-lg font-extrabold">Costing (per person)</h2>
          {variants.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-alt text-left">
                  <th className="p-3 font-semibold">Option</th>
                  <th className="p-3 text-right font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className="border-t border-black/5">
                    <td className="p-3">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} className="accent-brand-red" />
                        {v.label}
                      </label>
                    </td>
                    <td className="p-3 text-right">
                      {v.original_price && <span className="mr-2 text-xs text-muted line-through">{formatINR(v.original_price)}</span>}
                      <strong>{formatINR(v.price)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm">Starting price: <strong>{formatINR(basePrice)}</strong></p>
          )}
          <ul className="mt-4 list-inside list-disc space-y-1 text-xs text-muted">
            <li>5% GST is applicable on the listed price.</li>
            <li>Partial payment options are shown at checkout.</li>
          </ul>
        </div>

        <div className="rounded-card bg-surface-alt p-5">
          <p className="text-xs text-muted">Starting price</p>
          <p className="text-3xl font-extrabold text-brand-red">{formatINR(price)}<span className="ml-1 text-sm font-medium text-muted">per person</span></p>
          {batch && <p className="mt-1 text-sm text-muted">Selected: {formatDate(batch.starts_on)} – {formatDate(batch.ends_on)}</p>}
          <button
            type="button"
            disabled={!batch}
            onClick={() =>
              open({
                destination,
                title: "Reserve this departure",
                message: `I'd like to book ${tourTitle} departing ${batch ? formatDate(batch.starts_on) : ""}${variant ? ` (${variant.label})` : ""}.`,
              })
            }
            className="mt-4 w-full rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {batch ? "Continue" : "Select a date to continue"}
          </button>
          <p className="mt-2 text-xs text-muted">Online checkout with secure payment opens soon; until then our team will confirm your booking.</p>
        </div>
      </section>
    </div>
  );
}
