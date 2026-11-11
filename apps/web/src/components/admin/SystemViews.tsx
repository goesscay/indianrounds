"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/client-api";
import { can, useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { Badge, field, ghostBtn, Labeled, Modal, Pager, primaryBtn, Status, Table, Title, useList } from "./ui";

type Grievance = {
  id: number; reference: string; subject: string; description: string; customer: string; booking_reference: string | null; stage: number; status: string; officer_name: string | null;
  acknowledged_at: string | null; ack_due_at: string; resolve_by: string; statutory_deadline: string; resolved_at: string | null; resolution: string | null; created_at: string; can_act: boolean;
};

const stageName = ["", "Support team", "Escalation", "Final review"];

function ackState(g: Grievance) {
  if (g.status === "resolved") return <Badge tone="green">resolved</Badge>;
  if (g.acknowledged_at) return <Badge tone="blue">acknowledged</Badge>;
  return new Date(g.ack_due_at) < new Date() ? <Badge tone="red">ack overdue</Badge> : <Badge tone="amber">needs ack by {formatDate(g.ack_due_at.slice(0, 10))}</Badge>;
}

export function GrievancesList() {
  const [status, setStatus] = useState("open");
  const [stage, setStage] = useState("");
  const list = useList<Grievance>("grievances", { status, stage });
  const router = useRouter();

  return (
    <>
      <Title title="Grievances" sub="Acknowledge within 48 hours; resolve within 15 days (30-day statutory limit)" />
      <div className="mb-4 flex gap-3">
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); list.setPage(1); }} className={`${field} max-w-[10rem]`}>
          <option value="open">Open</option><option value="resolved">Resolved</option><option value="">All</option>
        </select>
        <select aria-label="Stage" value={stage} onChange={(e) => { setStage(e.target.value); list.setPage(1); }} className={`${field} max-w-[12rem]`}>
          <option value="">All stages</option><option value="1">Stage 1 — Support</option><option value="2">Stage 2 — Escalation</option><option value="3">Stage 3 — Final</option>
        </select>
      </div>
      <Table
        loading={list.loading}
        rows={list.rows}
        onRow={(r) => router.push(`/admin/grievances/${r.id}`)}
        cols={[
          { header: "Ticket", render: (r) => <><span className="font-semibold">{r.subject}</span><br /><span className="font-mono text-xs text-muted">{r.reference}</span></> },
          { header: "Customer", render: (r) => r.customer },
          { header: "Stage", render: (r) => `${r.stage} · ${stageName[r.stage]}` },
          { header: "Progress", render: ackState },
          { header: "Resolve by", render: (r) => formatDate(r.resolve_by.slice(0, 10)) },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
    </>
  );
}

export function GrievanceDetail({ id }: { id: string }) {
  const { data, loading, error, reload } = useApi<{ data: Grievance }>(`admin/grievances/${id}`);
  const [msg, setMsg] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const g = data?.data;

  async function act(action: "acknowledge" | "escalate") {
    setMsg(null);
    try {
      await apiFetch(`admin/grievances/${id}/${action}`, { method: "POST", body: {} });
      reload();
    } catch (e) {
      setMsg(e instanceof ApiError ? (Object.values(e.errors)[0]?.[0] ?? e.message) : "Failed.");
    }
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (error || !g) return <p className="text-muted">Ticket not found.</p>;

  return (
    <>
      <Link href="/admin/grievances" className="text-sm font-semibold text-brand-red">← All tickets</Link>
      <Title title={g.subject} sub={`${g.reference} · ${g.customer}${g.booking_reference ? ` · booking ${g.booking_reference}` : ""}`} action={ackState(g)} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-card bg-white p-5 shadow-sm">
          <p className="whitespace-pre-wrap text-sm">{g.description}</p>
          {g.resolution && <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm"><p className="font-semibold text-green-800">Resolution</p><p className="whitespace-pre-wrap">{g.resolution}</p></div>}
        </section>
        <aside className="space-y-3 rounded-card bg-white p-5 text-sm shadow-sm">
          <p><span className="text-muted">Stage</span><br /><strong>{g.stage} · {stageName[g.stage]}</strong></p>
          <p><span className="text-muted">Officer</span><br />{g.officer_name ?? "Unassigned"}</p>
          <p><span className="text-muted">Opened</span><br />{formatDate(g.created_at.slice(0, 10))}</p>
          <p><span className="text-muted">Acknowledge by</span><br />{formatDate(g.ack_due_at.slice(0, 10))}{g.acknowledged_at ? ` (done ${formatDate(g.acknowledged_at.slice(0, 10))})` : ""}</p>
          <p><span className="text-muted">Resolve by</span><br />{formatDate(g.resolve_by.slice(0, 10))} · statutory {formatDate(g.statutory_deadline.slice(0, 10))}</p>
          {g.can_act ? (
            <div className="flex flex-col gap-2 border-t border-black/10 pt-3">
              {!g.acknowledged_at && <button onClick={() => act("acknowledge")} className={primaryBtn}>Acknowledge</button>}
              <button onClick={() => setResolving(true)} className={primaryBtn}>Resolve</button>
              {g.stage < 3 && <button onClick={() => confirm("Escalate to the next stage?") && act("escalate")} className={ghostBtn}>Escalate to stage {g.stage + 1}</button>}
            </div>
          ) : g.status === "open" ? (
            <p className="border-t border-black/10 pt-3 text-xs text-muted">This ticket is at stage {g.stage}; only {g.stage >= 2 ? "an Admin" : "the handling team"} can act on it.</p>
          ) : null}
          {msg && <p role="alert" className="text-brand-red">{msg}</p>}
        </aside>
      </div>
      {resolving && <ResolveModal id={id} onClose={() => setResolving(false)} onDone={() => { setResolving(false); reload(); }} />}
    </>
  );
}

function ResolveModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await apiFetch(`admin/grievances/${id}/resolve`, { body: { resolution: new FormData(e.currentTarget).get("resolution") } });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? (Object.values(e2.errors)[0]?.[0] ?? e2.message) : "Failed.");
    }
  }

  return (
    <Modal title="Resolve ticket" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Labeled label="What was done? (shown to the customer's record)" id="rs"><textarea id="rs" name="resolution" required rows={5} className={field} /></Labeled>
        {err && <p role="alert" className="text-sm text-brand-red">{err}</p>}
        <button className={primaryBtn}>Mark resolved</button>
      </form>
    </Modal>
  );
}

type Member = { id: number; name: string; email: string; phone: string | null; department: string | null; department_label: string | null; tier: string; is_active: boolean };

export function TeamView() {
  const { user } = useAuth();
  const list = useList<Member>("users");
  const depts = useApi<{ data: { permissions: string[]; departments: { key: string; label: string }[] } }>("admin/roles");
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const isSuper = !user?.staff?.department;

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr({});
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      const res = await apiFetch<{ message: string }>("admin/users", { body: { name: f.name, email: f.email, phone: f.phone || undefined, department: isSuper ? f.department : user?.staff?.department, tier: isSuper ? f.tier : "staff" } });
      setInfo(res.message);
      setOpen(false);
      list.reload();
    } catch (e2) {
      if (e2 instanceof ApiError) setErr(e2.errors);
    }
    setBusy(false);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setErr({});
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const body: Record<string, unknown> = { name: f.name, email: f.email, phone: f.phone || null };
    if (f.password) body.password = f.password;
    if (isSuper) {
      body.department = f.department;
      body.tier = f.tier;
    }
    try {
      await apiFetch(`admin/users/${editing.id}`, { method: "PUT", body });
      setInfo(f.password ? "Details saved. The password was changed and their sessions were signed out." : "Details saved.");
      setEditing(null);
      list.reload();
    } catch (e2) {
      if (e2 instanceof ApiError) setErr(e2.errors);
    }
    setBusy(false);
  }

  async function toggle(m: Member) {
    try {
      await apiFetch(`admin/users/${m.id}`, { method: "PUT", body: { is_active: !m.is_active } });
      list.reload();
    } catch (e) {
      setInfo(e instanceof ApiError ? (Object.values(e.errors)[0]?.[0] ?? e.message) : "Failed.");
    }
  }

  return (
    <>
      <Title title="Team" sub={isSuper ? "All staff accounts" : `Staff in ${user?.staff?.department_label}`} action={<button onClick={() => setOpen(true)} className={primaryBtn}>Add {isSuper ? "team member" : "staff member"}</button>} />
      {info && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{info}</p>}
      <Table
        loading={list.loading}
        rows={list.rows}
        cols={[
          { header: "Name", render: (r) => <><span className="font-semibold">{r.name}</span><br /><span className="text-xs text-muted">{r.email}</span></> },
          { header: "Department", render: (r) => r.department_label ?? "All" },
          { header: "Tier", render: (r) => <Badge tone={r.tier === "staff" ? "gray" : "blue"}>{r.tier.replace("_", " ")}</Badge> },
          { header: "Status", render: (r) => (r.is_active ? <Status value="active" /> : <Badge tone="red">disabled</Badge>) },
          { header: "", render: (r) => r.tier !== "super_admin" && r.id !== user?.id && (isSuper || r.tier === "staff") ? <span className="flex gap-4"><button onClick={() => { setErr({}); setEditing(r); }} className="font-semibold text-ink hover:text-brand-red">Edit</button><button onClick={() => toggle(r)} className="text-brand-red">{r.is_active ? "Deactivate" : "Reactivate"}</button></span> : null },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <Labeled label="Full name *" id="e-name" error={err.name?.[0]}><input id="e-name" name="name" required defaultValue={editing.name} className={field} /></Labeled>
            <Labeled label="Work email *" id="e-email" error={err.email?.[0]}><input id="e-email" name="email" type="email" required defaultValue={editing.email} className={field} /></Labeled>
            <Labeled label="Mobile" id="e-phone" error={err.phone?.[0]}><input id="e-phone" name="phone" inputMode="numeric" defaultValue={editing.phone ?? ""} className={field} /></Labeled>
            {isSuper && (
              <div className="grid grid-cols-2 gap-4">
                <Labeled label="Department *" id="e-dept" error={err.department?.[0]}><select id="e-dept" name="department" required defaultValue={editing.department ?? ""} className={field}>{(depts.data?.data.departments ?? []).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></Labeled>
                <Labeled label="Tier *" id="e-tier" error={err.tier?.[0]}><select id="e-tier" name="tier" defaultValue={editing.tier} className={field}><option value="staff">Staff</option><option value="admin">Admin</option></select></Labeled>
              </div>
            )}
            <Labeled label="New password (leave blank to keep the current one)" id="e-pass" error={err.password?.[0]}><input id="e-pass" name="password" type="password" autoComplete="new-password" minLength={10} className={field} /></Labeled>
            <p className="text-xs text-muted">At least 10 characters with letters and numbers. Changing it signs them out everywhere.</p>
            <button disabled={busy} className={primaryBtn}>Save changes</button>
          </form>
        </Modal>
      )}
      {open && (
        <Modal title="Add a team member" onClose={() => setOpen(false)}>
          <form onSubmit={create} className="space-y-4">
            <Labeled label="Full name *" id="u-name" error={err.name?.[0]}><input id="u-name" name="name" required className={field} /></Labeled>
            <Labeled label="Work email *" id="u-email" error={err.email?.[0]}><input id="u-email" name="email" type="email" required className={field} /></Labeled>
            <Labeled label="Mobile" id="u-phone" error={err.phone?.[0]}><input id="u-phone" name="phone" inputMode="numeric" className={field} /></Labeled>
            {isSuper ? (
              <div className="grid grid-cols-2 gap-4">
                <Labeled label="Department *" id="u-dept" error={err.department?.[0]}><select id="u-dept" name="department" required defaultValue="" className={field}><option value="" disabled>Select…</option>{(depts.data?.data.departments ?? []).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></Labeled>
                <Labeled label="Tier *" id="u-tier"><select id="u-tier" name="tier" defaultValue="staff" className={field}><option value="staff">Staff</option><option value="admin">Admin</option></select></Labeled>
              </div>
            ) : (
              <p className="text-sm text-muted">The new account will be Staff in {user?.staff?.department_label}.</p>
            )}
            <p className="text-xs text-muted">They get an email with a link to set their own password.</p>
            <button disabled={busy} className={primaryBtn}>Create account</button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function RolesView() {
  const { data, loading } = useApi<{ data: { permissions: string[]; departments: { key: string; label: string; staff: string[]; admin: string[] }[] } }>("admin/roles");
  if (loading || !data) return <p className="text-muted">Loading…</p>;
  const { permissions, departments } = data.data;

  return (
    <>
      <Title title="Roles & access" sub="Which permissions each department and tier holds. Super Admin holds all. Change these in config/rbac.php." />
      <div className="overflow-x-auto rounded-card border border-black/10 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-surface-alt">
            <tr>
              <th className="sticky left-0 bg-surface-alt px-3 py-2 text-left">Permission</th>
              {departments.map((d) => <th key={d.key} colSpan={2} className="border-l border-black/10 px-2 py-2">{d.label}</th>)}
            </tr>
            <tr className="text-muted">
              <th className="sticky left-0 bg-surface-alt" />
              {departments.map((d) => <><th key={`${d.key}s`} className="border-l border-black/10 px-2 py-1">Staff</th><th key={`${d.key}a`} className="px-2 py-1">Admin</th></>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {permissions.map((p) => (
              <tr key={p}>
                <td className="sticky left-0 bg-white px-3 py-1.5 font-mono">{p}</td>
                {departments.map((d) => <><td key={`${d.key}s`} className="border-l border-black/10 px-2 py-1.5 text-center">{d.staff.includes(p) ? "●" : ""}</td><td key={`${d.key}a`} className="px-2 py-1.5 text-center">{d.admin.includes(p) ? "●" : ""}</td></>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

type Audit = { id: number; actor: string | null; action: string; subject: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null; ip: string | null; created_at: string };

export function AuditView() {
  const [action, setAction] = useState("");
  const list = useList<Audit>("audit", { action });
  const [open, setOpen] = useState<Audit | null>(null);

  return (
    <>
      <Title title="Audit log" sub="Every price, policy, refund, role and content change. Entries cannot be edited or deleted." />
      <input aria-label="Filter by action" placeholder="Filter by action, e.g. tour, refund, user…" value={action} onChange={(e) => { setAction(e.target.value); list.setPage(1); }} className={`${field} mb-4 max-w-sm`} />
      <Table
        loading={list.loading}
        rows={list.rows}
        onRow={setOpen}
        cols={[
          { header: "When", render: (r) => r.created_at.slice(0, 16).replace("T", " ") },
          { header: "Who", render: (r) => r.actor ?? "system" },
          { header: "Action", render: (r) => <span className="font-mono text-xs">{r.action}</span> },
          { header: "On", render: (r) => r.subject ?? "—" },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
      {open && (
        <Modal title={open.action} onClose={() => setOpen(null)} wide>
          <p className="mb-3 text-sm text-muted">{open.actor ?? "system"} · {open.created_at.replace("T", " ").slice(0, 19)} · {open.ip ?? "no ip"}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="mb-1 text-xs font-semibold uppercase text-muted">Before</p><pre className="overflow-x-auto rounded-lg bg-surface-alt p-3 text-xs">{JSON.stringify(open.before, null, 2) ?? "—"}</pre></div>
            <div><p className="mb-1 text-xs font-semibold uppercase text-muted">After</p><pre className="overflow-x-auto rounded-lg bg-surface-alt p-3 text-xs">{JSON.stringify(open.after, null, 2) ?? "—"}</pre></div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function SettingsView() {
  const { user } = useAuth();
  const { data, loading, reload } = useApi<{ data: { refund_staff_limit: number; credit_note_staff_limit: number } }>("admin/settings");
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      await apiFetch("admin/settings", { method: "PUT", body: { refund_staff_limit: Number(f.refund_staff_limit), credit_note_staff_limit: Number(f.credit_note_staff_limit) } });
      setMsg("Saved.");
      reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? (Object.values(err.errors)[0]?.[0] ?? err.message) : "Failed.");
    }
  }

  if (!can(user, "settings.manage")) return <p className="text-muted">Only a Super Admin can change settings.</p>;
  if (loading || !data) return <p className="text-muted">Loading…</p>;

  return (
    <>
      <Title title="Settings" sub="Approval thresholds for Staff" />
      <form key={`${data.data.refund_staff_limit}-${data.data.credit_note_staff_limit}`} onSubmit={save} className="max-w-md space-y-4 rounded-card bg-white p-6 shadow-sm">
        <Labeled label="Refund limit for Staff (₹). Above this, an Admin must approve." id="s-ref"><input id="s-ref" name="refund_staff_limit" type="number" min={0} required defaultValue={data.data.refund_staff_limit} className={field} /></Labeled>
        <Labeled label="Credit-note limit for Staff (₹)" id="s-cn"><input id="s-cn" name="credit_note_staff_limit" type="number" min={0} required defaultValue={data.data.credit_note_staff_limit} className={field} /></Labeled>
        {msg && <p role="status" className={`text-sm ${msg === "Saved." ? "text-green-700" : "text-brand-red"}`}>{msg}</p>}
        <button className={primaryBtn}>Save settings</button>
      </form>
    </>
  );
}
