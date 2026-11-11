"use client";

import { useState } from "react";
import { ApiError } from "@/lib/client-api";
import { field } from "./ui";

export const MAX_IMAGE_MB = 5;

/**
 * A photo field with a Browse button, a preview and an address box that stays editable (a link or a site photo path
 * also works). It renders a normal input named `name`, so it works inside a plain <form> that reads FormData.
 */
export function ImageUploadField({ id, name, label, initial, upload, hint }: { id: string; name: string; label: string; initial?: string | null; upload: (file: File) => Promise<string>; hint?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setBusy(true);
    try {
      setValue(await upload(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The photo could not be uploaded.");
    }
    setBusy(false);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid h-24 w-36 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-black/20 bg-surface-alt text-xs text-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : "No photo yet"}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark has-[:disabled]:opacity-60">
              {busy ? "Uploading…" : value ? "Browse to replace" : "Browse…"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {value && <button type="button" onClick={() => setValue("")} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold hover:border-brand-red">Clear</button>}
          </div>
          <input id={id} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="…or paste an image link" className={field} />
          <p className="text-xs text-muted">{hint ?? `JPG, PNG or WebP, up to ${MAX_IMAGE_MB} MB.`}</p>
          {error && <p role="alert" className="text-sm text-brand-red">{error}</p>}
        </div>
      </div>
    </div>
  );
}
