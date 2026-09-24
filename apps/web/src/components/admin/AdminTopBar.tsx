"use client";

import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ExternalLink, Menu, TriangleAlert } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/client-api";
import { can, type User } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import type { Maintenance } from "@/lib/maintenance";
import { dashboardItem, navGroups } from "./nav";
import { field, ghostBtn, Labeled, Modal, primaryBtn } from "./ui";

function whereAmI(path: string) {
  if (path === "/admin") return { group: null, title: dashboardItem.label };
  let best: { group: string; title: string; len: number } | null = null;
  for (const g of navGroups)
    for (const i of g.items)
      if ((path === i.href || path.startsWith(`${i.href}/`)) && (!best || i.href.length > best.len)) best = { group: g.label, title: i.label, len: i.href.length };
  return best ?? { group: null, title: "Back office" };
}

export function AdminTopBar({ user, onMenu }: { user: User; onMenu: () => void }) {
  const path = usePathname();
  const here = whereAmI(path);
  const canToggle = can(user, "settings.manage");
  const { data, reload } = useApi<{ data: Maintenance }>("meta/maintenance");
  const m = data?.data;
  const [dialog, setDialog] = useState<"on" | "off" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(body: { enabled: boolean; message?: string; expected_back?: string }) {
    setBusy(true);
    setErr(null);
    try {
      await apiFetch("admin/maintenance", { method: "PUT", body });
      reload();
      setDialog(null);
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors)[0]?.[0] ?? e.message) : "Could not update maintenance mode.");
    }
    setBusy(false);
  }

  function enable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void save({ enabled: true, message: String(f.get("message") ?? "").trim() || undefined, expected_back: String(f.get("expected_back") ?? "").trim() || undefined });
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-black/10 bg-white px-4 sm:px-6">
        <button onClick={onMenu} aria-label="Open menu" className="-ml-1 rounded-md p-2 text-ink/70 hover:bg-surface-alt lg:hidden"><Menu size={20} /></button>
        <div className="min-w-0 leading-tight">
          {here.group && <p className="hidden truncate text-[11px] font-semibold uppercase tracking-wide text-muted sm:block">{here.group}</p>}
          <p className="truncate text-sm font-bold text-ink">{here.title}</p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {canToggle && m && (
            <div className="flex items-center gap-2.5">
              <span className={`hidden text-xs font-semibold sm:inline ${m.enabled ? "text-brand-red" : "text-muted"}`}>{m.enabled ? "Maintenance on" : "Site live"}</span>
              <button
                type="button"
                role="switch"
                aria-checked={m.enabled}
                aria-label="Maintenance mode"
                onClick={() => setDialog(m.enabled ? "off" : "on")}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red ${m.enabled ? "bg-brand-red" : "bg-black/20"}`}
              >
                <span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${m.enabled ? "translate-x-5" : ""}`} />
              </button>
            </div>
          )}
          <span className="hidden h-5 w-px bg-black/10 sm:block" aria-hidden />
          <a href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 text-xs font-semibold text-ink/70 hover:text-brand-red sm:flex">
            View site <ExternalLink size={13} />
          </a>
          <span className="grid size-8 place-items-center rounded-full bg-brand-red/10 text-xs font-bold text-brand-red" title={user.name} aria-label={user.name}>{user.name.slice(0, 1).toUpperCase()}</span>
        </div>
      </header>

      {m?.enabled && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-brand-red px-4 py-2 text-xs font-semibold text-white sm:px-6">
          <TriangleAlert size={15} className="shrink-0" />
          <span>Maintenance mode is ON. Visitors see the maintenance page; sign-in and this back office still work.</span>
          {canToggle && <button onClick={() => setDialog("off")} className="ml-auto rounded-full bg-white px-3 py-1 text-brand-red hover:bg-white/90">Turn off</button>}
        </div>
      )}

      {dialog === "on" && (
        <Modal title="Turn on maintenance mode?" onClose={() => setDialog(null)}>
          <form onSubmit={enable} className="space-y-4">
            <p className="text-sm text-muted">Visitors will see a maintenance page instead of the website. Bookings and payments on the site pause, but the back office, sign-in and payment webhooks keep working.</p>
            <Labeled label="Message to visitors (optional)" id="mt-msg"><textarea id="mt-msg" name="message" rows={3} maxLength={300} placeholder="We're upgrading our booking system." className={field} /></Labeled>
            <Labeled label="Expected back (optional)" id="mt-eta"><input id="mt-eta" name="expected_back" maxLength={100} placeholder="Around 6:00 PM IST today" className={field} /></Labeled>
            {err && <p role="alert" className="text-sm text-brand-red">{err}</p>}
            <div className="flex gap-3"><button disabled={busy} className={primaryBtn}>Turn on maintenance</button><button type="button" onClick={() => setDialog(null)} className={ghostBtn}>Cancel</button></div>
          </form>
        </Modal>
      )}
      {dialog === "off" && (
        <Modal title="Bring the site back online?" onClose={() => setDialog(null)}>
          <p className="mb-4 text-sm text-muted">The website will be visible to everyone again straight away.</p>
          {err && <p role="alert" className="mb-3 text-sm text-brand-red">{err}</p>}
          <div className="flex gap-3"><button disabled={busy} onClick={() => void save({ enabled: false })} className={primaryBtn}>Turn off maintenance</button><button onClick={() => setDialog(null)} className={ghostBtn}>Cancel</button></div>
        </Modal>
      )}
    </>
  );
}
