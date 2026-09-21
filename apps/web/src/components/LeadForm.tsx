"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const countryCodes = ["+91", "+971", "+65", "+66", "+60", "+94", "+960", "+44", "+1", "+61"];

type Props = {
  source?: "quote" | "callback" | "contact";
  defaultDestination?: string;
  defaultMessage?: string;
  onDone?: () => void;
  compact?: boolean;
};

const field = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20";

export function LeadForm({ source = "quote", defaultDestination = "", defaultMessage = "", onDone, compact }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrors({});
    const form = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    form.forEach((v, k) => {
      if (typeof v === "string" && v.trim() !== "") body[k] = v.trim();
    });
    body.page = window.location.pathname;

    try {
      const res = await fetch(`${API}/leads/${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(json.message ?? "Thank you! We will contact you shortly.");
        setStatus("done");
        return;
      }
      if (res.status === 422) setErrors(json.errors ?? {});
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="text-green-600" size={48} />
        <p className="font-semibold">{message}</p>
        {onDone && (
          <button onClick={onDone} className="rounded-full bg-brand-red px-6 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark">
            Close
          </button>
        )}
      </div>
    );
  }

  const err = (k: string) => errors[k]?.[0] && <p className="mt-1 text-xs text-brand-red">{errors[k][0]}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div>
        <label className="mb-1 block text-xs font-medium" htmlFor={`name-${source}`}>Full name *</label>
        <input id={`name-${source}`} name="name" required className={field} autoComplete="name" />
        {err("name")}
      </div>
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium" htmlFor={`cc-${source}`}>Code</label>
          <select id={`cc-${source}`} name="country_code" className={field} defaultValue="+91">
            {countryCodes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium" htmlFor={`phone-${source}`}>Phone *</label>
          <input id={`phone-${source}`} name="phone" inputMode="numeric" required className={field} autoComplete="tel-national" placeholder="9876543210" />
          {err("phone")}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium" htmlFor={`email-${source}`}>Email</label>
        <input id={`email-${source}`} name="email" type="email" className={field} autoComplete="email" />
        {err("email")}
      </div>
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor={`dest-${source}`}>Destination</label>
            <input id={`dest-${source}`} name="destination" defaultValue={defaultDestination} className={field} placeholder="Where do you want to go?" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor={`date-${source}`}>Travel date</label>
            <input id={`date-${source}`} name="travel_date" type="date" className={field} />
            {err("travel_date")}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor={`trav-${source}`}>Travellers</label>
            <input id={`trav-${source}`} name="travellers" type="number" min={1} max={100} className={field} placeholder="2" />
          </div>
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium" htmlFor={`msg-${source}`}>Message</label>
        <textarea id={`msg-${source}`} name="message" rows={3} defaultValue={defaultMessage} className={field} />
      </div>
      {status === "error" && Object.keys(errors).length === 0 && (
        <p className="text-sm text-brand-red">Something went wrong. Please try again or call us.</p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-brand-red px-6 py-3 font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : source === "callback" ? "Request a Call Back" : "Submit"}
      </button>
    </form>
  );
}
