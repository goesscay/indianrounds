"use client";

import { useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/client-api";
import { can, useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { field, ghostBtn, Labeled, Modal, Pager, primaryBtn, Status, Table, Title, useList, type Meta } from "./ui";

type Dest = { id: number; name: string; slug: string; region: string; tagline: string | null; starting_price: number | null; best_time: string | null; featured: boolean; sort: number; tours_count: number; image_url: string | null; seo_content: { overview?: string } | null };

export function DestinationsView() {
  const { user } = useAuth();
  const { data, loading, reload } = useApi<{ data: Dest[] }>("admin/destinations");
  const [editing, setEditing] = useState<Dest | "new" | null>(null);
  const manage = can(user, "destinations.manage");
  const del = can(user, "destinations.delete");

  return (
    <>
      <Title title="Destinations" action={manage && <button onClick={() => setEditing("new")} className={primaryBtn}>New destination</button>} />
      <Table
        loading={loading}
        rows={data?.data ?? []}
        onRow={manage ? (r) => setEditing(r) : undefined}
        cols={[
          { header: "Name", render: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Region", render: (r) => r.region },
          { header: "From", render: (r) => (r.starting_price ? formatINR(r.starting_price) : "—") },
          { header: "Tours", render: (r) => r.tours_count },
          { header: "Featured", render: (r) => (r.featured ? <Status value="active" /> : "—") },
        ]}
      />
      {editing && <DestinationForm initial={editing === "new" ? null : editing} canDelete={del} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}

function DestinationForm({ initial, canDelete, onClose, onSaved }: { initial: Dest | null; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const body = {
      name: f.name, region: f.region, tagline: f.tagline || null, starting_price: f.starting_price ? Number(f.starting_price) : null,
      best_time: f.best_time || null, image_url: f.image_url || null, featured: f.featured === "on", sort: Number(f.sort || 0),
      seo_content: { overview: f.overview || undefined },
    };
    try {
      await apiFetch(initial ? `admin/destinations/${initial.id}` : "admin/destinations", { method: initial ? "PUT" : "POST", body });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial || !confirm(`Delete ${initial.name}?`)) return;
    try {
      await apiFetch(`admin/destinations/${initial.id}`, { method: "DELETE" });
      onSaved();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Could not delete.");
    }
  }

  return (
    <Modal title={initial ? `Edit ${initial.name}` : "New destination"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Name *" id="d-name" error={errors.name?.[0]}><input id="d-name" name="name" required defaultValue={initial?.name} className={field} /></Labeled>
          <Labeled label="Region" id="d-region"><select id="d-region" name="region" defaultValue={initial?.region ?? "international"} className={field}><option value="india">India</option><option value="international">International</option></select></Labeled>
          <Labeled label="Tagline" id="d-tag"><input id="d-tag" name="tagline" defaultValue={initial?.tagline ?? ""} className={field} /></Labeled>
          <Labeled label="Starting price (₹)" id="d-price"><input id="d-price" name="starting_price" type="number" min={0} defaultValue={initial?.starting_price ?? ""} className={field} /></Labeled>
          <Labeled label="Best time to visit" id="d-best"><input id="d-best" name="best_time" defaultValue={initial?.best_time ?? ""} className={field} /></Labeled>
          <Labeled label="Sort order" id="d-sort"><input id="d-sort" name="sort" type="number" min={0} defaultValue={initial?.sort ?? 0} className={field} /></Labeled>
        </div>
        <Labeled label="Image URL" id="d-img" error={errors.image_url?.[0]}><input id="d-img" name="image_url" type="url" defaultValue={initial?.image_url ?? ""} className={field} /></Labeled>
        <Labeled label="Overview (shown on the destination page)" id="d-over"><textarea id="d-over" name="overview" rows={4} defaultValue={initial?.seo_content?.overview ?? ""} className={field} /></Labeled>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="featured" defaultChecked={initial?.featured} className="accent-brand-red" /> Featured on homepage</label>
        {msg && <p role="alert" className="text-sm text-brand-red">{msg}</p>}
        <div className="flex gap-3">
          <button disabled={busy} className={primaryBtn}>Save</button>
          {initial && canDelete && <button type="button" onClick={remove} className={ghostBtn}>Delete</button>}
        </div>
      </form>
    </Modal>
  );
}

type Testimonial = { id: number; name: string; location: string | null; rating: number; quote: string; featured: boolean; sort: number };

export function TestimonialsView() {
  const { user } = useAuth();
  const { data, loading, reload } = useApi<{ data: Testimonial[] }>("admin/testimonials");
  const [editing, setEditing] = useState<Testimonial | "new" | null>(null);
  const manage = can(user, "testimonials.manage");

  return (
    <>
      <Title title="Testimonials" sub="Shown in the homepage carousel when featured" action={manage && <button onClick={() => setEditing("new")} className={primaryBtn}>Add testimonial</button>} />
      <Table
        loading={loading}
        rows={data?.data ?? []}
        onRow={manage ? (r) => setEditing(r) : undefined}
        cols={[
          { header: "Name", render: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Quote", render: (r) => <span className="line-clamp-2 max-w-md">{r.quote}</span> },
          { header: "Rating", render: (r) => "★".repeat(r.rating) },
          { header: "Shown", render: (r) => (r.featured ? <Status value="active" /> : <Status value="draft" />) },
        ]}
      />
      {editing && <TestimonialForm initial={editing === "new" ? null : editing} canDelete={can(user, "testimonials.delete")} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}

function TestimonialForm({ initial, canDelete, onClose, onSaved }: { initial: Testimonial | null; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      await apiFetch(initial ? `admin/testimonials/${initial.id}` : "admin/testimonials", { method: initial ? "PUT" : "POST", body: { name: f.name, location: f.location || null, quote: f.quote, rating: Number(f.rating), featured: f.featured === "on", sort: Number(f.sort || 0) } });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      setBusy(false);
    }
  }

  return (
    <Modal title={initial ? "Edit testimonial" : "Add testimonial"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Labeled label="Traveller name *" id="tm-name" error={errors.name?.[0]}><input id="tm-name" name="name" required defaultValue={initial?.name} className={field} /></Labeled>
        <Labeled label="Location" id="tm-loc"><input id="tm-loc" name="location" defaultValue={initial?.location ?? ""} className={field} /></Labeled>
        <Labeled label="Quote *" id="tm-quote" error={errors.quote?.[0]}><textarea id="tm-quote" name="quote" required rows={4} defaultValue={initial?.quote} className={field} /></Labeled>
        <div className="grid grid-cols-2 gap-4">
          <Labeled label="Rating" id="tm-rate"><select id="tm-rate" name="rating" defaultValue={initial?.rating ?? 5} className={field}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></Labeled>
          <Labeled label="Sort" id="tm-sort"><input id="tm-sort" name="sort" type="number" min={0} defaultValue={initial?.sort ?? 0} className={field} /></Labeled>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="featured" defaultChecked={initial?.featured ?? true} className="accent-brand-red" /> Show on the website</label>
        <div className="flex gap-3">
          <button disabled={busy} className={primaryBtn}>Save</button>
          {initial && canDelete && <button type="button" className={ghostBtn} onClick={async () => { if (confirm("Delete this testimonial?")) { await apiFetch(`admin/testimonials/${initial.id}`, { method: "DELETE" }); onSaved(); } }}>Delete</button>}
        </div>
      </form>
    </Modal>
  );
}

type Lead = { id: number; name: string; phone: string; email: string | null; destination: string | null; travellers: number | null; travel_date: string | null; message: string | null; source: string; page: string | null; status: string; notes: string | null; assigned_to: number | null; created_at: string };

export function LeadsView() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [q, setQ] = useState("");
  const list = useList<Lead>("leads", { status, source, q });
  const [open, setOpen] = useState<Lead | null>(null);

  return (
    <>
      <Title title="Leads" sub="Enquiries from the website forms" />
      <div className="mb-4 flex flex-wrap gap-3">
        <input aria-label="Search leads" placeholder="Name, phone, email, destination…" value={q} onChange={(e) => { setQ(e.target.value); list.setPage(1); }} className={`${field} max-w-xs`} />
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); list.setPage(1); }} className={`${field} max-w-[10rem]`}>
          <option value="">All statuses</option>
          {["new", "contacted", "qualified", "won", "lost"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Source" value={source} onChange={(e) => { setSource(e.target.value); list.setPage(1); }} className={`${field} max-w-[10rem]`}>
          <option value="">All sources</option>
          {["callback", "quote", "contact"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <Table
        loading={list.loading}
        rows={list.rows}
        onRow={setOpen}
        cols={[
          { header: "Name", render: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Contact", render: (r) => <>{r.phone}<br /><span className="text-xs text-muted">{r.email}</span></> },
          { header: "Interest", render: (r) => r.destination ?? "—" },
          { header: "Source", render: (r) => r.source },
          { header: "Status", render: (r) => <Status value={r.status} /> },
          { header: "Received", render: (r) => r.created_at.slice(0, 10) },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
      {open && <LeadModal lead={open} meId={user?.id ?? 0} canManage={can(user, "leads.manage")} canDelete={can(user, "leads.delete")} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); list.reload(); }} />}
    </>
  );
}

function LeadModal({ lead, meId, canManage, canDelete, onClose, onSaved }: { lead: Lead; meId: number; canManage: boolean; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      await apiFetch(`admin/leads/${lead.id}`, { method: "PUT", body: { status: f.status, notes: f.notes || null, assigned_to: f.mine === "on" ? meId : lead.assigned_to } });
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <Modal title={lead.name} onClose={onClose} wide>
      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Phone</dt><dd>{lead.phone}</dd></div>
        <div><dt className="text-muted">Email</dt><dd>{lead.email ?? "—"}</dd></div>
        <div><dt className="text-muted">Destination</dt><dd>{lead.destination ?? "—"}</dd></div>
        <div><dt className="text-muted">Travellers / date</dt><dd>{lead.travellers ?? "—"} / {lead.travel_date ?? "—"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-muted">Message</dt><dd className="whitespace-pre-wrap">{lead.message ?? "—"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-muted">Came from</dt><dd>{lead.source} · {lead.page ?? "—"}</dd></div>
      </dl>
      {canManage ? (
        <form onSubmit={save} className="space-y-3 border-t border-black/10 pt-4">
          <Labeled label="Status" id="l-status"><select id="l-status" name="status" defaultValue={lead.status} className={field}>{["new", "contacted", "qualified", "won", "lost"].map((s) => <option key={s}>{s}</option>)}</select></Labeled>
          <Labeled label="Notes" id="l-notes"><textarea id="l-notes" name="notes" rows={3} defaultValue={lead.notes ?? ""} className={field} /></Labeled>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="mine" defaultChecked={lead.assigned_to === meId} className="accent-brand-red" /> Assign to me</label>
          {err && <p role="alert" className="text-sm text-brand-red">{err}</p>}
          <div className="flex gap-3">
            <button disabled={busy} className={primaryBtn}>Save</button>
            {canDelete && <button type="button" className={ghostBtn} onClick={async () => { if (confirm("Delete this lead?")) { await apiFetch(`admin/leads/${lead.id}`, { method: "DELETE" }); onSaved(); } }}>Delete</button>}
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">Status: <Status value={lead.status} /></p>
      )}
    </Modal>
  );
}

type Customer = { id: number; name: string; email: string; phone: string | null; gst_state: string | null; bookings_count: number; joined: string };

export function CustomersView() {
  const [q, setQ] = useState("");
  const list = useList<Customer>("customers", { q });

  return (
    <>
      <Title title="Customers" />
      <input aria-label="Search customers" placeholder="Name, email or phone…" value={q} onChange={(e) => { setQ(e.target.value); list.setPage(1); }} className={`${field} mb-4 max-w-xs`} />
      <Table
        loading={list.loading}
        rows={list.rows}
        cols={[
          { header: "Name", render: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Email", render: (r) => r.email },
          { header: "Phone", render: (r) => r.phone ?? "—" },
          { header: "State", render: (r) => r.gst_state ?? "—" },
          { header: "Bookings", render: (r) => r.bookings_count },
          { header: "Joined", render: (r) => r.joined },
        ]}
      />
      <Pager meta={list.meta as Meta | undefined} page={list.page} onPage={list.setPage} />
    </>
  );
}
