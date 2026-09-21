"use client";

import { useState } from "react";
import type { Booking, Milestone } from "@/lib/api";
import { ApiError, apiFetch } from "@/lib/client-api";
import { formatINR } from "@/lib/format";

type Order = {
  driver: "razorpay" | "fake";
  key_id: string | null;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
};

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCtor = new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function PayButton({ reference, milestone, onPaid, label }: { reference: string; milestone: Milestone; onPaid: (b: Booking) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fakeOrder, setFakeOrder] = useState<Order | null>(null);
  const base = `bookings/${reference}/milestones/${milestone.id}`;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const { data: order } = await apiFetch<{ data: Order }>(`${base}/order`, { method: "POST", body: {} });

      if (order.driver === "fake") {
        setFakeOrder(order);
        setBusy(false);
        return;
      }

      if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection and retry.");

      const rz = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: order.name,
        description: order.description,
        prefill: order.prefill,
        theme: { color: "#cc0a00" },
        handler: async (resp: RazorpayResponse) => {
          try {
            const { data } = await apiFetch<{ data: Booking }>(`${base}/verify`, { method: "POST", body: resp });
            onPaid(data);
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "Payment received but could not be verified yet. Please refresh in a moment.");
          }
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on("payment.failed", () => {
        setError("Payment failed. You can try again.");
        setBusy(false);
      });
      rz.open();
    } catch (e) {
      setError(e instanceof ApiError ? (e.first("milestone") ?? e.first("booking") ?? e.message) : e instanceof Error ? e.message : "Could not start payment.");
      setBusy(false);
    }
  }

  async function simulate() {
    setBusy(true);
    try {
      const { data } = await apiFetch<{ data: Booking }>(`${base}/simulate`, { method: "POST", body: {} });
      setFakeOrder(null);
      onPaid(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Simulation failed.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      {fakeOrder ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-900">Test mode — no real payment</p>
          <p className="mb-2 text-amber-800">Razorpay keys are not configured, so this payment is simulated.</p>
          <button onClick={simulate} disabled={busy} className="rounded-full bg-amber-600 px-5 py-2 font-semibold text-white disabled:opacity-60">
            Simulate successful payment of {formatINR(milestone.amount)}
          </button>
        </div>
      ) : (
        <button onClick={start} disabled={busy} className="rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60">
          {busy ? "Please wait…" : (label ?? `Pay ${formatINR(milestone.amount)}`)}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-brand-red">{error}</p>}
    </div>
  );
}
