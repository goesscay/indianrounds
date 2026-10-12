import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { CheckCircle2, Clock, Hourglass, XCircle } from "lucide-react";
import type { Booking } from "@/lib/api";

type IconType = ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;

export const bookingStatus: Record<Booking["status"], { label: string; className: string; icon: IconType }> = {
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800", icon: CheckCircle2 },
  pending_payment: { label: "Awaiting payment", className: "bg-amber-100 text-amber-800", icon: Clock },
  expired: { label: "Expired", className: "bg-gray-100 text-gray-600", icon: Hourglass },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600", icon: XCircle },
};

export function StatusBadge({ status, size = "sm" }: { status: Booking["status"]; size?: "sm" | "md" }) {
  const s = bookingStatus[status];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${s.className} ${size === "md" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs"}`}>
      <Icon size={size === "md" ? 16 : 13} aria-hidden /> {s.label}
    </span>
  );
}

/** A thin bar showing how much of a total has been paid. */
export function PaidBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Amount paid" className="h-2 overflow-hidden rounded-full bg-black/10">
      <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: IconType; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-surface-alt px-6 py-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-brand-red shadow-sm"><Icon size={26} aria-hidden /></span>
      <p className="mt-4 text-lg font-bold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{text}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark">{children}</Link>;
}

export function OutlineLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="rounded-full border border-black/20 bg-white px-6 py-2.5 text-sm font-semibold hover:border-brand-red hover:text-brand-red">{children}</Link>;
}

/** Placeholder rows shown while account data loads. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-black/5" />
      ))}
    </div>
  );
}

export function Card({ title, icon: Icon, children, className = "" }: { title?: string; icon?: IconType; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      {title && (
        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
          {Icon && <Icon size={19} className="text-brand-red" aria-hidden />} {title}
        </h2>
      )}
      {children}
    </section>
  );
}

/** Whole days from today (UTC date) to an ISO date. */
export function daysUntil(iso: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
