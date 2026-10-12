"use client";

import type { Booking } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { PayButton } from "./PayButton";

const badge: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  due: "bg-amber-100 text-amber-800",
  cancelled: "bg-gray-100 text-gray-600",
};
const icon = { paid: CheckCircle2, due: Clock, cancelled: XCircle } as const;
const iconColour: Record<string, string> = { paid: "text-green-600", due: "text-amber-600", cancelled: "text-gray-400" };

export function MilestoneList({ booking, onPaid }: { booking: Booking; onPaid: (b: Booking) => void }) {
  const payable = booking.status === "pending_payment" || booking.status === "confirmed";
  const nextDue = booking.milestones.find((m) => m.status === "due");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ol className="relative space-y-0">
      {booking.milestones.map((m, i) => {
        const Icon = icon[m.status as keyof typeof icon] ?? Clock;
        const overdue = m.status === "due" && m.due_on < today;
        return (
          <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < booking.milestones.length - 1 && <span className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-black/10" aria-hidden />}
            <Icon size={24} className={`relative z-10 shrink-0 rounded-full bg-white ${iconColour[m.status] ?? "text-gray-400"}`} aria-hidden />
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4">
              <div>
                <p className="font-semibold">{m.label}</p>
                <p className="text-xs text-muted">Due {formatDate(m.due_on)}{overdue && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">Overdue</span>}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-extrabold">{formatINR(m.amount)}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badge[m.status]}`}>{m.status}</span>
                {payable && nextDue?.id === m.id && <PayButton reference={booking.reference} milestone={m} onPaid={onPaid} />}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
