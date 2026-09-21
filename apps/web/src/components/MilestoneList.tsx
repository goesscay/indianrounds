"use client";

import type { Booking } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { PayButton } from "./PayButton";

const badge: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  due: "bg-amber-100 text-amber-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export function MilestoneList({ booking, onPaid }: { booking: Booking; onPaid: (b: Booking) => void }) {
  const payable = booking.status === "pending_payment" || booking.status === "confirmed";
  const nextDue = booking.milestones.find((m) => m.status === "due");

  return (
    <ul className="divide-y divide-black/5 rounded-card border border-black/10">
      {booking.milestones.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold">{m.label}</p>
            <p className="text-xs text-muted">Due {formatDate(m.due_on)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold">{formatINR(m.amount)}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badge[m.status]}`}>{m.status}</span>
            {payable && nextDue?.id === m.id && <PayButton reference={booking.reference} milestone={m} onPaid={onPaid} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
