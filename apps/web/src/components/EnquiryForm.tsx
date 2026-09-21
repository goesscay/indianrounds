"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const field = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20";

export const eventTypes = [
  { value: "offsite", label: "Leadership offsite" },
  { value: "team_outing", label: "Team outing" },
  { value: "conference", label: "Conference / MICE" },
  { value: "dealer_meet", label: "Dealer meet" },
  { value: "rewards_recognition", label: "Rewards & recognition" },
  { value: "other", label: "Something else" },
];

export const travellerTypes = [
  { value: "family", label: "Family" },
  { value: "couple", label: "Couple / honeymoon" },
  { value: "friends", label: "Friends" },
  { value: "solo", label: "Solo" },
  { value: "group", label: "Larger group" },
];

type Kind = "corporate" | "custom";

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
    </div>
  );
}

/** Corporate quote request or custom-trip enquiry. Both are stored as leads and routed to the owning department. */
export function EnquiryForm({ kind }: { kind: Kind }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrors({});
    const f = new FormData(e.currentTarget);
    const val = (k: string) => {
      const v = f.get(k);
      return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
    };

    const details: Record<string, unknown> = { budget: val("budget") };
    if (kind === "corporate") {
      details.team_size = val("team_size") ? Number(val("team_size")) : undefined;
      details.event_type = val("event_type");
      details.international = f.get("international") === "on";
    } else {
      details.traveller_type = val("traveller_type");
      details.flexible_dates = f.get("flexible_dates") === "on";
      details.interests = val("interests");
    }
    const body = {
      name: val("name"),
      country_code: val("country_code") ?? "+91",
      phone: val("phone"),
      email: val("email"),
      company: kind === "corporate" ? val("company") : undefined,
      destination: val("destination"),
      travel_date: val("travel_date"),
      travellers: kind === "custom" && val("travellers") ? Number(val("travellers")) : undefined,
      message: val("message"),
      page: window.location.pathname,
      details: Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined)),
    };

    try {
      const res = await fetch(`${API}/leads/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(json.message ?? "Thank you! Our team will contact you shortly.");
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
      <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
        <CheckCircle2 className="text-green-600" size={52} />
        <p className="text-lg font-semibold">{message}</p>
        <p className="text-sm text-muted">We usually reply within one working day.</p>
      </div>
    );
  }

  const err = (k: string) => errors[k]?.[0];
  const id = (k: string) => `${kind}-${k}`;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name *" id={id("name")} error={err("name")}>
          <input id={id("name")} name="name" required autoComplete="name" className={field} />
        </Field>
        {kind === "corporate" && (
          <Field label="Company *" id={id("company")} error={err("company")}>
            <input id={id("company")} name="company" required autoComplete="organization" className={field} />
          </Field>
        )}
        <Field label="Work email *" id={id("email")} error={err("email")}>
          <input id={id("email")} name="email" type="email" required autoComplete="email" className={field} />
        </Field>
        <Field label="Phone *" id={id("phone")} error={err("phone")}>
          <input id={id("phone")} name="phone" inputMode="numeric" required autoComplete="tel-national" placeholder="9876543210" className={field} />
        </Field>
      </div>

      {kind === "corporate" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Team size *" id={id("team_size")} error={err("details.team_size")}>
            <input id={id("team_size")} name="team_size" type="number" min={5} max={5000} required className={field} placeholder="40" />
          </Field>
          <Field label="What is the event? *" id={id("event_type")} error={err("details.event_type")}>
            <select id={id("event_type")} name="event_type" required defaultValue="" className={field}>
              <option value="" disabled>Select…</option>
              {eventTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Who is travelling? *" id={id("traveller_type")} error={err("details.traveller_type")}>
            <select id={id("traveller_type")} name="traveller_type" required defaultValue="" className={field}>
              <option value="" disabled>Select…</option>
              {travellerTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Number of travellers" id={id("travellers")} error={err("travellers")}>
            <input id={id("travellers")} name="travellers" type="number" min={1} max={5000} className={field} placeholder="2" />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Destination" id={id("destination")} error={err("destination")}>
          <input id={id("destination")} name="destination" className={field} placeholder="Where to?" />
        </Field>
        <Field label="Preferred date" id={id("travel_date")} error={err("travel_date")}>
          <input id={id("travel_date")} name="travel_date" type="date" className={field} />
        </Field>
        <Field label="Budget (approx.)" id={id("budget")} error={err("details.budget")}>
          <input id={id("budget")} name="budget" className={field} placeholder="e.g. ₹1.5 lakh per person" />
        </Field>
      </div>

      {kind === "custom" && (
        <Field label="What do you enjoy? (food, hikes, beaches, culture…)" id={id("interests")} error={err("details.interests")}>
          <input id={id("interests")} name="interests" className={field} />
        </Field>
      )}

      <Field label="Anything else we should know?" id={id("message")} error={err("message")}>
        <textarea id={id("message")} name="message" rows={4} className={field} />
      </Field>

      <div className="flex flex-wrap gap-6 text-sm">
        {kind === "corporate" ? (
          <label className="flex items-center gap-2"><input type="checkbox" name="international" className="size-4 accent-brand-red" /> Open to international destinations</label>
        ) : (
          <label className="flex items-center gap-2"><input type="checkbox" name="flexible_dates" className="size-4 accent-brand-red" /> My dates are flexible</label>
        )}
      </div>

      {status === "error" && Object.keys(errors).length === 0 && <p role="alert" className="text-sm text-brand-red">Something went wrong. Please try again or call us.</p>}
      {status === "error" && Object.keys(errors).length > 0 && <p role="alert" className="text-sm text-brand-red">Please fix the highlighted fields.</p>}
      <button type="submit" disabled={status === "sending"} className="rounded-full bg-brand-red px-8 py-3 font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-60">
        {status === "sending" ? "Sending…" : kind === "corporate" ? "Request a Corporate Quote" : "Design My Trip"}
      </button>
    </form>
  );
}
