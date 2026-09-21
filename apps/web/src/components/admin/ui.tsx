"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useApi } from "@/lib/use-api";

export type Meta = { current_page: number; last_page: number; total: number };
export type Page<T> = { data: T[]; meta?: Meta };

export const field = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20";

export function Title({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

const tones = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-100 text-blue-800",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function statusTone(status: string): keyof typeof tones {
  if (["confirmed", "processed", "approved", "resolved", "published", "active", "won", "open", "paid"].includes(status)) return "green";
  if (["pending", "pending_payment", "pending_approval", "new", "draft", "contacted", "qualified"].includes(status)) return "amber";
  if (["rejected", "lost", "expired", "overdue", "sold_out"].includes(status)) return "red";
  return "gray";
}

export function Status({ value }: { value: string }) {
  return <Badge tone={statusTone(value)}>{value.replace(/_/g, " ")}</Badge>;
}

export type Col<T> = { header: string; render: (row: T) => ReactNode; className?: string };

export function Table<T>({ cols, rows, loading, empty = "Nothing here yet.", onRow }: { cols: Col<T>[]; rows: T[]; loading?: boolean; empty?: string; onRow?: (row: T) => void }) {
  return (
    <div className="overflow-x-auto rounded-card border border-black/10">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            {cols.map((c) => (
              <th key={c.header} className={`px-4 py-3 font-semibold ${c.className ?? ""}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((r, i) => (
            <tr key={i} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? "cursor-pointer hover:bg-surface-alt" : ""}>
              {cols.map((c) => (
                <td key={c.header} className={`px-4 py-3 align-top ${c.className ?? ""}`}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-muted">{empty}</td></tr>
          )}
          {loading && rows.length === 0 && (
            <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-muted">Loading…</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ meta, page, onPage }: { meta?: Meta; page: number; onPage: (p: number) => void }) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-sm">
      <span className="text-muted">Page {page} of {meta.last_page} · {meta.total} total</span>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-full border border-black/20 px-4 py-1.5 font-semibold disabled:opacity-40">Previous</button>
      <button disabled={page >= meta.last_page} onClick={() => onPage(page + 1)} className="rounded-full border border-black/20 px-4 py-1.5 font-semibold disabled:opacity-40">Next</button>
    </div>
  );
}

/** Paged list from an admin endpoint. `params` empty values are dropped. */
export function useList<T>(path: string, params: Record<string, string | undefined> = {}) {
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams(Object.entries({ ...params, page: String(page) }).filter(([, v]) => v) as [string, string][]).toString();
  const res = useApi<Page<T>>(`admin/${path}?${qs}`);
  return { rows: res.data?.data ?? [], meta: res.data?.meta, loading: res.loading, error: res.error, reload: res.reload, page, setPage };
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl ${wide ? "max-w-2xl" : "max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1 text-muted hover:bg-surface-alt"><X size={20} /></button>
        <h2 className="mb-4 pr-8 text-xl font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Labeled({ label, id, error, children }: { label: string; id: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
    </div>
  );
}

export const primaryBtn = "rounded-full bg-brand-red px-5 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60";
export const ghostBtn = "rounded-full border border-black/20 px-5 py-2 text-sm font-semibold hover:border-brand-red disabled:opacity-60";
