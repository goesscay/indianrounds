"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import type { JobOpening } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const field = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20";
const MAX_BYTES = 5 * 1024 * 1024;

export function ApplyForm({ openings, defaultOpening }: { openings: JobOpening[]; defaultOpening?: number }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Drop empty optional fields so the API's nullable rules apply.
    for (const [k, v] of Array.from(form.entries())) {
      if (typeof v === "string" && v.trim() === "") form.delete(k);
      if (v instanceof File && v.size === 0) form.delete(k);
    }
    const resume = form.get("resume");
    if (resume instanceof File && resume.size > MAX_BYTES) {
      setErrors({ resume: ["The resume must be 5 MB or smaller."] });
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrors({});
    try {
      // Multipart upload goes straight to the API (the same-origin proxy only carries JSON).
      const res = await fetch(`${API}/careers/apply`, { method: "POST", headers: { Accept: "application/json" }, body: form });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(json.message ?? "Thank you! Your application has been received.");
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
      </div>
    );
  }

  const err = (k: string) => errors[k]?.[0] && <p className="mt-1 text-xs text-brand-red">{errors[k][0]}</p>;
  const label = "mb-1 block text-xs font-medium";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="ap-opening" className={label}>Role</label>
        <select id="ap-opening" name="job_opening_id" defaultValue={defaultOpening ?? ""} className={field}>
          <option value="">General application</option>
          {openings.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
        {err("job_opening_id")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ap-name" className={label}>Full name *</label>
          <input id="ap-name" name="name" required autoComplete="name" className={field} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="ap-email" className={label}>Email *</label>
          <input id="ap-email" name="email" type="email" required autoComplete="email" className={field} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="ap-phone" className={label}>Phone *</label>
          <input id="ap-phone" name="phone" inputMode="numeric" required autoComplete="tel-national" placeholder="9876543210" className={field} />
          {err("phone")}
        </div>
        <div>
          <label htmlFor="ap-profile" className={label}>LinkedIn / portfolio URL</label>
          <input id="ap-profile" name="profile_url" type="url" placeholder="https://" className={field} />
          {err("profile_url")}
        </div>
        <div>
          <label htmlFor="ap-gender" className={label}>Gender</label>
          <select id="ap-gender" name="gender" defaultValue="" className={field}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="ap-age" className={label}>Age</label>
          <input id="ap-age" name="age" type="number" min={16} max={80} className={field} />
          {err("age")}
        </div>
      </div>
      <div>
        <label htmlFor="ap-exp" className={label}>Relevant experience *</label>
        <textarea id="ap-exp" name="experience" rows={4} required className={field} />
        {err("experience")}
      </div>
      <div>
        <label htmlFor="ap-msg" className={label}>Why Indian Rounds?</label>
        <textarea id="ap-msg" name="message" rows={3} className={field} />
        {err("message")}
      </div>
      <div>
        <label htmlFor="ap-resume" className={label}>Resume (PDF, DOC or DOCX, up to 5 MB)</label>
        <input id="ap-resume" name="resume" type="file" accept=".pdf,.doc,.docx" className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-alt file:px-4 file:py-2 file:font-semibold" />
        {err("resume")}
      </div>
      {status === "error" && Object.keys(errors).length === 0 && <p role="alert" className="text-sm text-brand-red">Something went wrong. Please try again.</p>}
      <button type="submit" disabled={status === "sending"} className="rounded-full bg-brand-red px-8 py-3 font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-60">
        {status === "sending" ? "Sending…" : "Submit application"}
      </button>
    </form>
  );
}
