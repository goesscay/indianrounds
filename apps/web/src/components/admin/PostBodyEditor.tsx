"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ApiError, uploadPostImage } from "@/lib/client-api";
import { MAX_FACTS, newId, type BodyBlock, type BodyBlockType, type FactRow } from "@/lib/post-body";
import { field } from "./ui";

const LABEL: Record<BodyBlockType, string> = { h2: "Section heading", h3: "Sub-heading", text: "Text", photo: "Photo", tip: "Tip box" };
const ADD: { type: BodyBlockType; label: string }[] = [
  { type: "h2", label: "Section heading" },
  { type: "text", label: "Text" },
  { type: "photo", label: "Photo" },
  { type: "tip", label: "Tip box" },
  { type: "h3", label: "Sub-heading" },
];

const iconBtn = "grid size-8 place-items-center rounded-full border border-black/15 text-ink/70 hover:border-brand-red hover:text-brand-red disabled:opacity-40";

function blank(type: BodyBlockType): BodyBlock {
  return type === "photo" ? { id: newId(), type, url: "", caption: "" } : { id: newId(), type, text: "" };
}

/** The article body as a list of fields: headings, text, photos and tip boxes. */
export function BodyEditor({ blocks, onChange, onError }: { blocks: BodyBlock[]; onChange: (blocks: BodyBlock[]) => void; onError: (message: string | null) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);

  const patch = (id: string, change: Partial<BodyBlock>) => onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...change } as BodyBlock) : b)));
  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const move = (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  async function browse(id: string, file: File | undefined) {
    if (!file) return;
    setUploading(id);
    onError(null);
    try {
      patch(id, { url: await uploadPostImage(file) });
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Upload failed.");
    }
    setUploading(null);
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 && <p className="rounded-lg bg-surface-alt p-4 text-sm text-muted">No content yet. Add a section heading, some text or a photo below.</p>}
      {blocks.map((b, i) => (
        <div key={b.id} className="rounded-card border border-black/10 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">{LABEL[b.type]}</span>
            <span className="flex gap-1.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${LABEL[b.type]} up`} className={iconBtn}><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label={`Move ${LABEL[b.type]} down`} className={iconBtn}><ArrowDown size={14} /></button>
              <button type="button" onClick={() => remove(b.id)} aria-label={`Remove ${LABEL[b.type]}`} className={iconBtn}><Trash2 size={14} /></button>
            </span>
          </div>

          {(b.type === "h2" || b.type === "h3") && (
            <input aria-label={LABEL[b.type]} value={b.text} onChange={(e) => patch(b.id, { text: e.target.value })} placeholder={b.type === "h2" ? "e.g. Munnar: tea, hills and mist" : "Sub-heading"} className={`${field} ${b.type === "h2" ? "text-base font-bold" : "font-semibold"}`} />
          )}

          {b.type === "text" && (
            <>
              <textarea aria-label="Text" value={b.text} onChange={(e) => patch(b.id, { text: e.target.value })} rows={Math.min(14, Math.max(4, b.text.split("\n").length + 1))} placeholder="Write the paragraph here. Start lines with - for bullets or 1. for a numbered list." className={field} />
              <p className="mt-1 text-xs text-muted">**bold**, *italic*, [link text](https://…). A blank line starts a new paragraph.</p>
            </>
          )}

          {b.type === "tip" && <textarea aria-label="Tip" value={b.text} onChange={(e) => patch(b.id, { text: e.target.value })} rows={3} placeholder="**Tip:** a short note shown in a highlighted box." className={`${field} bg-amber-50`} />}

          {b.type === "photo" && (
            <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
              <div className="grid h-24 place-items-center overflow-hidden rounded-lg border border-dashed border-black/20 bg-surface-alt text-xs text-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.url ? <img src={b.url} alt="" className="h-full w-full object-cover" /> : "No photo yet"}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark has-[:disabled]:opacity-60">
                    {uploading === b.id ? "Uploading…" : b.url ? "Browse to replace" : "Browse…"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading !== null} onChange={(e) => { void browse(b.id, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {b.url && <button type="button" onClick={() => patch(b.id, { url: "" })} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold hover:border-brand-red">Clear</button>}
                </div>
                <input aria-label="Photo address" value={b.url} onChange={(e) => patch(b.id, { url: e.target.value })} placeholder="…or paste an image link, or a site photo such as /photos/places/kerala/munnar-tea-plantations.jpg" className={field} />
                <input aria-label="Photo caption" value={b.caption} onChange={(e) => patch(b.id, { caption: e.target.value })} placeholder="Caption (optional)" className={field} />
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-alt p-3">
        <span className="mr-1 text-sm font-semibold">Add</span>
        {ADD.map((a) => (
          <button key={a.type} type="button" onClick={() => onChange([...blocks, blank(a.type)])} className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold shadow-sm hover:text-brand-red">
            <Plus size={14} aria-hidden /> {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Quick facts as Label / Value rows. */
export function FactsEditor({ rows, onChange }: { rows: FactRow[]; onChange: (rows: FactRow[]) => void }) {
  const patch = (id: string, change: Partial<FactRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...change } : r)));

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2">
          <input aria-label="Fact label" value={r.label} maxLength={40} onChange={(e) => patch(r.id, { label: e.target.value })} placeholder="Label, e.g. Best time" className={field} />
          <input aria-label="Fact value" value={r.value} maxLength={160} onChange={(e) => patch(r.id, { value: e.target.value })} placeholder="Value, e.g. October to March" className={field} />
          <button type="button" onClick={() => onChange(rows.filter((x) => x.id !== r.id))} aria-label="Remove this fact" className={iconBtn}><Trash2 size={14} /></button>
        </div>
      ))}
      {rows.length < MAX_FACTS ? (
        <button type="button" onClick={() => onChange([...rows, { id: newId(), label: "", value: "" }])} className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-3.5 py-1.5 text-sm font-semibold hover:text-brand-red"><Plus size={14} aria-hidden /> Add a fact</button>
      ) : (
        <p className="text-xs text-muted">That is the maximum of {MAX_FACTS} facts.</p>
      )}
    </div>
  );
}
