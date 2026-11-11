"use client";

import { useState, type FormEvent } from "react";
import { ApiError, apiFetch, uploadPostImage } from "@/lib/client-api";
import { defaultPostLayout, postTypes, type PostLayout } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { factsToRows, parseBody, rowsToFacts, serializeBody } from "@/lib/post-body";
import { BodyEditor, FactsEditor } from "./PostBodyEditor";
import { field, ghostBtn, Labeled, Modal, Pager, primaryBtn, Status, Table, Title, useList } from "./ui";

// ---------- Blog posts ----------

type PostRow = { id: number; title: string; slug: string; status: string; content_type: string; destination: string | null; author_name: string; read_minutes: number; published_at: string | null };
type PostFull = { id: number; title: string; slug: string; excerpt: string | null; body: string; content_type: string; destination_id: number | null; author_name: string; cover_image_url: string | null; meta_description: string | null; status: string; is_featured: boolean; key_facts: { label: string; value: string }[] | null; layout?: PostLayout };

export function PostsView() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const list = useList<PostRow>("posts", { status, q });
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const manage = can(user, "posts.manage");

  return (
    <>
      <Title title="Blog posts" sub="Destination guides and stories. Staff write drafts; an Admin publishes." action={manage && <button onClick={() => setEditing("new")} className={primaryBtn}>New post</button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <input aria-label="Search posts" placeholder="Search titles…" value={q} onChange={(e) => { setQ(e.target.value); list.setPage(1); }} className={`${field} max-w-xs`} />
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); list.setPage(1); }} className={`${field} max-w-[10rem]`}>
          <option value="">All statuses</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </div>
      <Table
        loading={list.loading}
        rows={list.rows}
        onRow={(r) => setEditing(r.id)}
        cols={[
          { header: "Title", render: (r) => <span className="font-semibold">{r.title}</span> },
          { header: "Type", render: (r) => postTypes.find((t) => t.key === r.content_type)?.label ?? r.content_type },
          { header: "Destination", render: (r) => r.destination ?? "—" },
          { header: "Author", render: (r) => r.author_name },
          { header: "Status", render: (r) => <Status value={r.status} /> },
          { header: "Published", render: (r) => r.published_at?.slice(0, 10) ?? "—" },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
      {editing !== null && <PostEditor id={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}
    </>
  );
}

function PostEditor({ id, onClose, onSaved }: { id: number | "new"; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const existing = useApi<{ data: PostFull }>(id === "new" ? null : `admin/posts/${id}`);
  const dests = useApi<{ data: { id: number; name: string }[] }>("admin/destinations");

  // Wait for both loads: a <select>'s defaultValue is only applied when its options exist at mount.
  if ((id !== "new" && !existing.data) || !dests.data) {
    return <Modal title="Post" onClose={onClose} wide><p className="text-muted">{existing.error || dests.error ? "Could not load the post." : "Loading…"}</p></Modal>;
  }
  const initial = existing.data?.data ?? null;
  return (
    <Modal title={initial ? "Edit post" : "New post"} onClose={onClose} wide>
      <PostForm initial={initial} destinations={dests.data.data} canPublish={can(user, "posts.publish")} canDelete={can(user, "posts.delete")} authorName={user?.name ?? ""} onSaved={onSaved} />
    </Modal>
  );
}

const toggles: [keyof PostLayout, string][] = [
  ["show_breadcrumbs", "Breadcrumbs"],
  ["show_author_date", "Author, date and read time"],
  ["show_excerpt", "Intro (excerpt) above the text"],
  ["show_quick_facts", "Quick facts box"],
  ["show_toc", "Table of contents"],
  ["show_plan_card", "Plan your trip card"],
  ["show_share", "Share buttons"],
  ["show_disclaimer", "Travel-rules note"],
  ["show_trips", "Trips to this destination"],
  ["show_related", "Keep reading (related articles)"],
];

function PostForm({ initial, destinations, canPublish, canDelete, authorName, onSaved }: { initial: PostFull | null; destinations: { id: number; name: string }[]; canPublish: boolean; canDelete: boolean; authorName: string; onSaved: () => void }) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cover, setCover] = useState(initial?.cover_image_url ?? "");
  const [uploading, setUploading] = useState<"cover" | null>(null);
  const [blocks, setBlocks] = useState(() => parseBody(initial?.body ?? ""));
  const [facts, setFacts] = useState(() => factsToRows(initial?.key_facts));
  const layout = { ...defaultPostLayout, ...(initial?.layout ?? {}) };

  async function pickCover(file: File | undefined) {
    if (!file) return;
    setUploading("cover");
    setMsg(null);
    try {
      setCover(await uploadPostImage(file));
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Upload failed.");
    }
    setUploading(null);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    const text = serializeBody(blocks);
    if (!text) {
      setErrors({ body: ["Add some content: at least one heading, text or photo."] });
      setBusy(false);
      return;
    }
    const form = new FormData(e.currentTarget);
    const f = Object.fromEntries(form.entries()) as Record<string, string>;
    const picked = {
      hero_style: f.hero_style, hero_height: f.hero_height, sidebar: f.sidebar, content_width: f.content_width,
      cta_title: f.cta_title || null, cta_text: f.cta_text || null,
      ...Object.fromEntries(toggles.map(([key]) => [key, form.get(key) === "on"])),
    };
    const body = {
      layout: picked,
      title: f.title, body: text, excerpt: f.excerpt || null, content_type: f.content_type,
      destination_id: f.destination_id ? Number(f.destination_id) : null, author_name: f.author_name || authorName,
      cover_image_url: cover || null, meta_description: f.meta_description || null,
      is_featured: f.is_featured === "on",
      key_facts: rowsToFacts(facts),
      ...(f.slug ? { slug: f.slug } : {}),
      ...(canPublish ? { status: f.status } : {}),
    };
    try {
      await apiFetch(initial ? `admin/posts/${initial.id}` : "admin/posts", { method: initial ? "PUT" : "POST", body });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors);
        setMsg(err.message);
      }
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial || !confirm(`Delete "${initial.title}"?`)) return;
    try {
      await apiFetch(`admin/posts/${initial.id}`, { method: "DELETE" });
      onSaved();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Could not delete.");
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Labeled label="Title *" id="p-title" error={errors.title?.[0]}><input id="p-title" name="title" required defaultValue={initial?.title} className={field} /></Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Content type" id="p-type"><select id="p-type" name="content_type" defaultValue={initial?.content_type ?? "general"} className={field}>{postTypes.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Labeled>
        <Labeled label="Destination" id="p-dest"><select id="p-dest" name="destination_id" defaultValue={initial?.destination_id ?? ""} className={field}><option value="">None</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Labeled>
        <Labeled label="Author" id="p-author"><input id="p-author" name="author_name" defaultValue={initial?.author_name ?? authorName} className={field} /></Labeled>
        <Labeled label="URL slug (optional)" id="p-slug" error={errors.slug?.[0]}><input id="p-slug" name="slug" defaultValue={initial?.slug} placeholder="auto from title" className={field} /></Labeled>
      </div>
      <Labeled label="Cover image" id="p-cover" error={errors.cover_image_url?.[0]}>
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover && <img src={cover} alt="" className="h-16 w-28 rounded-lg border border-black/10 object-cover" />}
          <label className="cursor-pointer rounded-full border border-black/15 px-4 py-2 text-sm font-semibold hover:border-brand-red hover:text-brand-red">
            {uploading === "cover" ? "Uploading…" : cover ? "Replace photo" : "Upload photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading !== null} onChange={(e) => { void pickCover(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {cover && <button type="button" onClick={() => setCover("")} className="text-sm text-brand-red">Remove</button>}
        </div>
        <input id="p-cover" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="…or paste an image link, or a site photo such as /photos/places/kerala/alleppey-houseboat.jpg" className={`${field} mt-2`} />
        <p className="mt-1 text-xs text-muted">JPG, PNG or WebP, up to 5 MB. A wide photo (3:2 or 16:9) works best.</p>
      </Labeled>
      <Labeled label="Excerpt (shown on cards)" id="p-ex" error={errors.excerpt?.[0]}><textarea id="p-ex" name="excerpt" rows={2} defaultValue={initial?.excerpt ?? ""} className={field} /></Labeled>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Article content *</legend>
        <p className="text-xs text-muted">Build the article from fields: add a section heading, then its text and photos, in the order they should appear. No formatting code needed. Use the arrows to reorder.</p>
        <BodyEditor blocks={blocks} onChange={setBlocks} onError={setMsg} />
        {errors.body?.[0] && <p role="alert" className="text-xs text-brand-red">{errors.body[0]}</p>}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Quick facts</legend>
        <p className="text-xs text-muted">Shown in a box beside the article, for example Best time: October to March. Up to 8 facts.</p>
        <FactsEditor rows={facts} onChange={setFacts} />
        {errors.key_facts?.[0] && <p role="alert" className="text-xs text-brand-red">{errors.key_facts[0]}</p>}
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="is_featured" defaultChecked={initial?.is_featured ?? false} className="size-4 accent-brand-red" /> Feature this article at the top of the blog page</label>
      <fieldset className="space-y-4 rounded-card border border-black/10 p-4">
        <legend className="px-2 text-sm font-bold">Page layout</legend>
        <p className="text-xs text-muted">Choose how this article page looks. You only write the content; the page is arranged for you.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Header style" id="l-hero"><select id="l-hero" name="hero_style" defaultValue={layout.hero_style} className={field}><option value="overlay">Title over a full-width photo</option><option value="banner">Photo banner, title below</option><option value="minimal">No photo in the header</option></select></Labeled>
          <Labeled label="Header height" id="l-height"><select id="l-height" name="hero_height" defaultValue={layout.hero_height} className={field}><option value="compact">Compact</option><option value="standard">Standard</option><option value="tall">Tall</option></select></Labeled>
          <Labeled label="Side column (quick facts, contents, plan card)" id="l-side"><select id="l-side" name="sidebar" defaultValue={layout.sidebar} className={field}><option value="right">On the right</option><option value="left">On the left</option><option value="none">None, single column</option></select></Labeled>
          <Labeled label="Page width" id="l-width"><select id="l-width" name="content_width" defaultValue={layout.content_width} className={field}><option value="narrow">Narrow</option><option value="standard">Standard</option><option value="wide">Wide</option></select></Labeled>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Show on the page</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {toggles.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" name={key} defaultChecked={Boolean(layout[key])} className="size-4 accent-brand-red" /> {label}</label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Plan card heading (optional)" id="l-cta-t" error={errors["layout.cta_title"]?.[0]}><input id="l-cta-t" name="cta_title" maxLength={100} defaultValue={layout.cta_title} placeholder="Plan Kerala with us" className={field} /></Labeled>
          <Labeled label="Plan card text (optional)" id="l-cta-x" error={errors["layout.cta_text"]?.[0]}><input id="l-cta-x" name="cta_text" maxLength={200} defaultValue={layout.cta_text} placeholder="Tell us your dates and budget…" className={field} /></Labeled>
        </div>
      </fieldset>
      <Labeled label="Meta description (search results)" id="p-meta" error={errors.meta_description?.[0]}><input id="p-meta" name="meta_description" defaultValue={initial?.meta_description ?? ""} className={field} /></Labeled>
      {canPublish ? (
        <Labeled label="Status" id="p-status" error={errors.status?.[0]}><select id="p-status" name="status" defaultValue={initial?.status ?? "draft"} className={field}><option value="draft">draft</option><option value="published">published</option></select></Labeled>
      ) : (
        <p className="text-sm text-muted">Status: <Status value={initial?.status ?? "draft"} /> — an Admin publishes posts.</p>
      )}
      {msg && <p role="alert" className="text-sm text-brand-red">{msg}</p>}
      <div className="flex gap-3">
        <button disabled={busy} className={primaryBtn}>Save</button>
        {initial && canDelete && <button type="button" onClick={remove} className={ghostBtn}>Delete</button>}
      </div>
    </form>
  );
}

// ---------- Case studies ----------

type CaseRow = { id: number; client_name: string; destination: string; headcount: number; blurb: string; quote: string | null; quote_name: string | null; quote_title: string | null; published: boolean; sort: number };

export function CaseStudiesView() {
  const { user } = useAuth();
  const { data, loading, reload } = useApi<{ data: CaseRow[] }>("admin/case-studies");
  const [editing, setEditing] = useState<CaseRow | "new" | null>(null);

  return (
    <>
      <Title title="Case studies" sub="Shown on the Corporate page when published" action={<button onClick={() => setEditing("new")} className={primaryBtn}>Add case study</button>} />
      <Table
        loading={loading}
        rows={data?.data ?? []}
        onRow={setEditing}
        cols={[
          { header: "Client", render: (r) => <span className="font-semibold">{r.client_name}</span> },
          { header: "Destination", render: (r) => r.destination },
          { header: "People", render: (r) => r.headcount },
          { header: "Shown", render: (r) => <Status value={r.published ? "published" : "draft"} /> },
        ]}
      />
      {editing && <CaseForm initial={editing === "new" ? null : editing} canDelete={can(user, "case_studies.delete")} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}

function CaseForm({ initial, canDelete, onClose, onSaved }: { initial: CaseRow | null; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const body = {
      client_name: f.client_name, destination: f.destination, headcount: Number(f.headcount), blurb: f.blurb,
      quote: f.quote || null, quote_name: f.quote_name || null, quote_title: f.quote_title || null,
      published: f.published === "on", sort: Number(f.sort || 0),
    };
    try {
      await apiFetch(initial ? `admin/case-studies/${initial.id}` : "admin/case-studies", { method: initial ? "PUT" : "POST", body });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      setBusy(false);
    }
  }

  return (
    <Modal title={initial ? "Edit case study" : "Add case study"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Client *" id="c-client" error={errors.client_name?.[0]}><input id="c-client" name="client_name" required defaultValue={initial?.client_name} className={field} /></Labeled>
          <Labeled label="Destination *" id="c-dest" error={errors.destination?.[0]}><input id="c-dest" name="destination" required defaultValue={initial?.destination} className={field} /></Labeled>
          <Labeled label="Headcount *" id="c-count" error={errors.headcount?.[0]}><input id="c-count" name="headcount" type="number" min={1} required defaultValue={initial?.headcount} className={field} /></Labeled>
          <Labeled label="Sort" id="c-sort"><input id="c-sort" name="sort" type="number" min={0} defaultValue={initial?.sort ?? 0} className={field} /></Labeled>
        </div>
        <Labeled label="What we delivered *" id="c-blurb" error={errors.blurb?.[0]}><textarea id="c-blurb" name="blurb" required rows={3} defaultValue={initial?.blurb} className={field} /></Labeled>
        <Labeled label="Client quote (only with the client's permission)" id="c-quote"><textarea id="c-quote" name="quote" rows={2} defaultValue={initial?.quote ?? ""} className={field} /></Labeled>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Quote by" id="c-qn"><input id="c-qn" name="quote_name" defaultValue={initial?.quote_name ?? ""} className={field} /></Labeled>
          <Labeled label="Job title" id="c-qt"><input id="c-qt" name="quote_title" defaultValue={initial?.quote_title ?? ""} className={field} /></Labeled>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="published" defaultChecked={initial?.published ?? false} className="accent-brand-red" /> Show on the website</label>
        <div className="flex gap-3">
          <button disabled={busy} className={primaryBtn}>Save</button>
          {initial && canDelete && <button type="button" className={ghostBtn} onClick={async () => { if (confirm("Delete this case study?")) { await apiFetch(`admin/case-studies/${initial.id}`, { method: "DELETE" }); onSaved(); } }}>Delete</button>}
        </div>
      </form>
    </Modal>
  );
}

// ---------- Careers ----------

type Opening = { id: number; title: string; department: string | null; location: string | null; employment_type: string | null; description: string; status: string; sort: number; applications_count: number };
type Application = { id: number; opening: string; name: string; email: string; phone: string; gender: string | null; age: number | null; profile_url: string | null; experience: string; message: string | null; has_resume: boolean; resume_name: string | null; status: string; notes: string | null; created_at: string };

export function CareersView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"applications" | "openings">("applications");
  const manage = can(user, "careers.manage");

  return (
    <>
      <Title title="Careers" sub="Job openings and incoming applications" />
      <div role="tablist" className="mb-4 flex gap-2">
        {(["applications", "openings"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${tab === t ? "border-brand-red bg-brand-red text-white" : "border-black/15 hover:border-brand-red"}`}>{t}</button>
        ))}
      </div>
      {tab === "applications" ? <ApplicationsTab canManage={manage} /> : <OpeningsTab canManage={manage} canDelete={can(user, "careers.delete")} />}
    </>
  );
}

function ApplicationsTab({ canManage }: { canManage: boolean }) {
  const [status, setStatus] = useState("");
  const list = useList<Application>("careers/applications", { status });
  const [open, setOpen] = useState<Application | null>(null);

  return (
    <>
      <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); list.setPage(1); }} className={`${field} mb-4 max-w-[10rem]`}>
        <option value="">All statuses</option>
        {["new", "shortlisted", "rejected", "hired"].map((s) => <option key={s}>{s}</option>)}
      </select>
      <Table
        loading={list.loading}
        rows={list.rows}
        onRow={setOpen}
        cols={[
          { header: "Applicant", render: (r) => <><span className="font-semibold">{r.name}</span><br /><span className="text-xs text-muted">{r.email}</span></> },
          { header: "Role", render: (r) => r.opening },
          { header: "Résumé", render: (r) => (r.has_resume ? "Yes" : "—") },
          { header: "Status", render: (r) => <Status value={r.status} /> },
          { header: "Received", render: (r) => r.created_at.slice(0, 10) },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
      {open && <ApplicationModal app={open} canManage={canManage} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); list.reload(); }} />}
    </>
  );
}

function ApplicationModal({ app, canManage, onClose, onSaved }: { app: Application; canManage: boolean; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      await apiFetch(`admin/careers/applications/${app.id}`, { method: "PUT", body: { status: f.status, notes: f.notes || null } });
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not save.");
      setBusy(false);
    }
  }

  // The résumé is private: fetch it through the authorised endpoint and save the blob.
  async function download() {
    setErr(null);
    try {
      const res = await fetch(`/api/backend/admin/careers/applications/${app.id}/resume`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = app.resume_name ?? `resume-${app.id}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr("Could not download the résumé.");
    }
  }

  return (
    <Modal title={app.name} onClose={onClose} wide>
      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Applying for</dt><dd>{app.opening}</dd></div>
        <div><dt className="text-muted">Contact</dt><dd>{app.phone} · {app.email}</dd></div>
        <div><dt className="text-muted">Gender / age</dt><dd>{app.gender ?? "—"} / {app.age ?? "—"}</dd></div>
        <div><dt className="text-muted">Profile</dt><dd>{app.profile_url ? <a href={app.profile_url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-red underline">{app.profile_url}</a> : "—"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-muted">Experience</dt><dd className="whitespace-pre-wrap">{app.experience}</dd></div>
        {app.message && <div className="sm:col-span-2"><dt className="text-muted">Message</dt><dd className="whitespace-pre-wrap">{app.message}</dd></div>}
        <div className="sm:col-span-2">
          <dt className="text-muted">Résumé</dt>
          <dd>{app.has_resume ? <button type="button" onClick={download} className="font-semibold text-brand-red underline">Download {app.resume_name}</button> : "Not provided"}</dd>
        </div>
      </dl>
      {canManage ? (
        <form onSubmit={save} className="space-y-3 border-t border-black/10 pt-4">
          <Labeled label="Status" id="a-status"><select id="a-status" name="status" defaultValue={app.status} className={field}>{["new", "shortlisted", "rejected", "hired"].map((s) => <option key={s}>{s}</option>)}</select></Labeled>
          <Labeled label="Notes" id="a-notes"><textarea id="a-notes" name="notes" rows={3} defaultValue={app.notes ?? ""} className={field} /></Labeled>
          {err && <p role="alert" className="text-sm text-brand-red">{err}</p>}
          <button disabled={busy} className={primaryBtn}>Save</button>
        </form>
      ) : (
        <>
          {err && <p role="alert" className="text-sm text-brand-red">{err}</p>}
          <p className="text-sm text-muted">Status: <Status value={app.status} /></p>
        </>
      )}
    </Modal>
  );
}

function OpeningsTab({ canManage, canDelete }: { canManage: boolean; canDelete: boolean }) {
  const { data, loading, reload } = useApi<{ data: Opening[] }>("admin/careers/openings");
  const [editing, setEditing] = useState<Opening | "new" | null>(null);

  return (
    <>
      {canManage && <button onClick={() => setEditing("new")} className={`${primaryBtn} mb-4`}>New opening</button>}
      <Table
        loading={loading}
        rows={data?.data ?? []}
        onRow={canManage ? setEditing : undefined}
        cols={[
          { header: "Title", render: (r) => <span className="font-semibold">{r.title}</span> },
          { header: "Department", render: (r) => r.department ?? "—" },
          { header: "Location", render: (r) => r.location ?? "—" },
          { header: "Applications", render: (r) => r.applications_count },
          { header: "Status", render: (r) => <Status value={r.status} /> },
        ]}
      />
      {editing && <OpeningForm initial={editing === "new" ? null : editing} canDelete={canDelete} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}

function OpeningForm({ initial, canDelete, onClose, onSaved }: { initial: Opening | null; canDelete: boolean; onClose: () => void; onSaved: () => void }) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const body = {
      title: f.title, department: f.department || null, location: f.location || null, employment_type: f.employment_type || "Full-time",
      description: f.description, status: f.status, sort: Number(f.sort || 0),
    };
    try {
      await apiFetch(initial ? `admin/careers/openings/${initial.id}` : "admin/careers/openings", { method: initial ? "PUT" : "POST", body });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      setBusy(false);
    }
  }

  return (
    <Modal title={initial ? "Edit opening" : "New opening"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <Labeled label="Title *" id="o-title" error={errors.title?.[0]}><input id="o-title" name="title" required defaultValue={initial?.title} className={field} /></Labeled>
        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled label="Department" id="o-dept"><input id="o-dept" name="department" defaultValue={initial?.department ?? ""} className={field} /></Labeled>
          <Labeled label="Location" id="o-loc"><input id="o-loc" name="location" defaultValue={initial?.location ?? ""} className={field} /></Labeled>
          <Labeled label="Type" id="o-type"><input id="o-type" name="employment_type" defaultValue={initial?.employment_type ?? "Full-time"} className={field} /></Labeled>
        </div>
        <Labeled label="Description *" id="o-desc" error={errors.description?.[0]}><textarea id="o-desc" name="description" required rows={6} defaultValue={initial?.description} className={field} /></Labeled>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Status" id="o-status"><select id="o-status" name="status" defaultValue={initial?.status ?? "open"} className={field}><option value="open">open</option><option value="closed">closed</option></select></Labeled>
          <Labeled label="Sort" id="o-sort"><input id="o-sort" name="sort" type="number" min={0} defaultValue={initial?.sort ?? 0} className={field} /></Labeled>
        </div>
        <div className="flex gap-3">
          <button disabled={busy} className={primaryBtn}>Save</button>
          {initial && canDelete && <button type="button" className={ghostBtn} onClick={async () => { if (confirm("Delete this opening? Applications are kept.")) { await apiFetch(`admin/careers/openings/${initial.id}`, { method: "DELETE" }); onSaved(); } }}>Delete</button>}
        </div>
      </form>
    </Modal>
  );
}
