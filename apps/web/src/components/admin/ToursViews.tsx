"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/client-api";
import { can, useAuth } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { Badge, field, ghostBtn, Labeled, Pager, primaryBtn, Status, Table, Title, useList } from "./ui";

type TourRow = { id: number; slug: string; title: string; status: string; featured: boolean; destination: string; duration_nights: number; price: number | null; show_price: boolean; haul_class: string; batches_count: number };

export function ToursList() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const list = useList<TourRow>("tours", { status, q });
  const router = useRouter();

  return (
    <>
      <Title title="Tours" action={can(user, "tours.manage") && <Link href="/admin/tours/new" className={primaryBtn}>New tour</Link>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <input aria-label="Search tours" placeholder="Search title…" value={q} onChange={(e) => { setQ(e.target.value); list.setPage(1); }} className={`${field} max-w-xs`} />
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); list.setPage(1); }} className={`${field} max-w-[10rem]`}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <Table
        loading={list.loading}
        rows={list.rows}
        onRow={(r) => router.push(`/admin/tours/${r.id}`)}
        cols={[
          { header: "Tour", render: (r) => <span className="font-semibold">{r.title}</span> },
          { header: "Destination", render: (r) => r.destination },
          { header: "Nights", render: (r) => r.duration_nights },
          { header: "From", render: (r) => (r.price === null ? <span className="text-muted">On request</span> : <>{formatINR(r.price)}{!r.show_price && <span className="ml-1.5 rounded bg-surface-alt px-1.5 py-0.5 text-[10px] font-semibold text-muted">hidden</span>}</>) },
          { header: "Departures", render: (r) => r.batches_count },
          { header: "Status", render: (r) => <Status value={r.status} /> },
        ]}
      />
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
    </>
  );
}

type Variant = { id: number; label: string; price: number; original_price: number | null };
type BatchRow = { id: number; starts_on: string; ends_on: string; capacity: number; seats_booked: number; status: string };
type TourFull = {
  id: number; destination_id: number; title: string; slug: string; summary: string | null; tour_type: string; haul_class: string; duration_nights: number;
  pickup: string | null; drop_point: string | null; overview: string | null; highlights: string[] | null; itinerary: { day: number; title: string; description: string }[] | null;
  inclusions: string[] | null; exclusions: string[] | null; notes: string[] | null; must_carry: string[] | null; image_url: string | null;
  tags?: string[] | null; base_price: number | null; original_price: number | null; show_price?: boolean; featured: boolean; status: string; variants?: Variant[]; batches?: BatchRow[];
};

export function TourEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const tour = useApi<{ data: TourFull }>(isNew ? null : `admin/tours/${id}`);
  const dests = useApi<{ data: { id: number; name: string }[] }>("admin/destinations");

  if (!isNew && tour.loading) return <p className="text-muted">Loading…</p>;
  if (!isNew && tour.error) return <p className="text-muted">Tour not found.</p>;
  // The destination <select> only honours defaultValue if its options exist when the form mounts.
  if (!dests.data) return <p className="text-muted">Loading…</p>;

  return (
    <>
      <Link href="/admin/tours" className="text-sm font-semibold text-brand-red">← All tours</Link>
      <TourForm key={tour.data?.data.id ?? "new"} initial={tour.data?.data ?? null} destinations={dests.data?.data ?? []} onSaved={tour.reload} />
      {!isNew && tour.data && <VariantsAndBatches tour={tour.data.data} reload={tour.reload} />}
    </>
  );
}

const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

function TourForm({ initial, destinations, onSaved }: { initial: TourFull | null; destinations: { id: number; name: string }[]; onSaved: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const canPublish = can(user, "tours.publish");
  const canDelete = can(user, "tours.delete");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const collections = useApi<{ data: { title: string; tag: string }[] }>("collections");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [itinerary, setItinerary] = useState(initial?.itinerary?.length ? initial.itinerary : [{ day: 1, title: "", description: "" }]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const body = {
      title: f.title, destination_id: Number(f.destination_id), summary: f.summary || null, tour_type: f.tour_type, haul_class: f.haul_class,
      duration_nights: Number(f.duration_nights), pickup: f.pickup || null, drop_point: f.drop_point || null, overview: f.overview || null,
      highlights: lines(f.highlights ?? ""), inclusions: lines(f.inclusions ?? ""), exclusions: lines(f.exclusions ?? ""), notes: lines(f.notes ?? ""), must_carry: lines(f.must_carry ?? ""),
      itinerary: itinerary.filter((d) => d.title.trim()).map((d, i) => ({ day: i + 1, title: d.title, description: d.description || d.title })),
      image_url: f.image_url || null, base_price: f.base_price ? Number(f.base_price) : null, original_price: f.original_price ? Number(f.original_price) : null, show_price: f.show_price === "on",
      tags, featured: f.featured === "on", ...(canPublish || !initial ? { status: f.status } : {}),
    };
    try {
      const res = await apiFetch<{ data: { id: number } }>(initial ? `admin/tours/${initial.id}` : "admin/tours", { method: initial ? "PUT" : "POST", body });
      setMsg("Saved.");
      if (!initial) router.replace(`/admin/tours/${res.data.id}`);
      else onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors);
        setMsg(Object.keys(err.errors).length ? "Please fix the highlighted fields." : err.message);
      }
    }
    setBusy(false);
  }

  async function remove() {
    if (!initial || !confirm("Delete this tour? This cannot be undone.")) return;
    try {
      await apiFetch(`admin/tours/${initial.id}`, { method: "DELETE" });
      router.replace("/admin/tours");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Could not delete.");
    }
  }

  const e1 = (k: string) => errors[k]?.[0];
  const v = (x: string[] | null | undefined) => (x ?? []).join("\n");

  return (
    <form onSubmit={save} className="mt-3 space-y-6 rounded-card bg-white p-6 shadow-sm">
      <Title title={initial ? initial.title : "New tour"} sub={initial ? `/tours/${initial.slug}` : "Saved as a draft until an Admin publishes it"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Title *" id="t-title" error={e1("title")}><input id="t-title" name="title" required defaultValue={initial?.title} className={field} /></Labeled>
        <Labeled label="Destination *" id="t-dest" error={e1("destination_id")}>
          <select id="t-dest" name="destination_id" required defaultValue={initial?.destination_id ?? ""} className={field}>
            <option value="" disabled>Select…</option>
            {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Labeled>
        <Labeled label="Nights *" id="t-nights" error={e1("duration_nights")}><input id="t-nights" name="duration_nights" type="number" min={0} required defaultValue={initial?.duration_nights} className={field} /></Labeled>
        <Labeled label="Type" id="t-type"><select id="t-type" name="tour_type" defaultValue={initial?.tour_type ?? "group"} className={field}><option value="group">Group departure</option><option value="custom">Custom</option></select></Labeled>
        <Labeled label="Haul class (drives payment & cancellation rules)" id="t-haul"><select id="t-haul" name="haul_class" defaultValue={initial?.haul_class ?? "short"} className={field}><option value="short">Short-haul</option><option value="long">Long-haul</option></select></Labeled>
        <Labeled label="Starting price (₹ per person), optional" id="t-price" error={e1("base_price")}><input id="t-price" name="base_price" type="number" min={1} defaultValue={initial?.base_price ?? ""} className={field} /></Labeled>
        <Labeled label="Original price (₹, strike-through)" id="t-orig"><input id="t-orig" name="original_price" type="number" min={0} defaultValue={initial?.original_price ?? ""} className={field} /></Labeled>
        <Labeled label="Image URL" id="t-img" error={e1("image_url")}><input id="t-img" name="image_url" placeholder="https://… or /uploads/…" defaultValue={initial?.image_url ?? ""} className={field} /></Labeled>
        <Labeled label="Pickup" id="t-pick"><input id="t-pick" name="pickup" defaultValue={initial?.pickup ?? ""} className={field} /></Labeled>
        <Labeled label="Drop" id="t-drop"><input id="t-drop" name="drop_point" defaultValue={initial?.drop_point ?? ""} className={field} /></Labeled>
      </div>
      <Labeled label="Summary" id="t-sum"><textarea id="t-sum" name="summary" rows={2} defaultValue={initial?.summary ?? ""} className={field} /></Labeled>
      <Labeled label="Overview" id="t-over"><textarea id="t-over" name="overview" rows={4} defaultValue={initial?.overview ?? ""} className={field} /></Labeled>

      <section>
        <h2 className="mb-2 font-extrabold">Itinerary</h2>
        <div className="space-y-3">
          {itinerary.map((d, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-black/10 p-3 sm:grid-cols-[4rem_1fr_auto]">
              <span className="grid size-8 place-items-center rounded-full bg-brand-red text-sm font-bold text-white">{i + 1}</span>
              <div className="space-y-2">
                <input aria-label={`Day ${i + 1} title`} placeholder="Title" value={d.title} onChange={(e) => setItinerary(itinerary.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className={field} />
                <textarea aria-label={`Day ${i + 1} description`} placeholder="What happens this day" rows={2} value={d.description} onChange={(e) => setItinerary(itinerary.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} className={field} />
              </div>
              <button type="button" onClick={() => setItinerary(itinerary.filter((_, j) => j !== i))} className="self-start text-sm text-muted hover:text-brand-red">Remove</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setItinerary([...itinerary, { day: itinerary.length + 1, title: "", description: "" }])} className={`${ghostBtn} mt-3`}>Add day</button>
        {e1("itinerary") && <p className="mt-1 text-xs text-brand-red">{e1("itinerary")}</p>}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Highlights (one per line)" id="t-hi"><textarea id="t-hi" name="highlights" rows={4} defaultValue={v(initial?.highlights)} className={field} /></Labeled>
        <Labeled label="Must carry (one per line)" id="t-mc"><textarea id="t-mc" name="must_carry" rows={4} defaultValue={v(initial?.must_carry)} className={field} /></Labeled>
        <Labeled label="Inclusions (one per line)" id="t-in"><textarea id="t-in" name="inclusions" rows={5} defaultValue={v(initial?.inclusions)} className={field} /></Labeled>
        <Labeled label="Exclusions (one per line)" id="t-ex"><textarea id="t-ex" name="exclusions" rows={5} defaultValue={v(initial?.exclusions)} className={field} /></Labeled>
        <Labeled label="Notes (one per line)" id="t-no"><textarea id="t-no" name="notes" rows={3} defaultValue={v(initial?.notes)} className={field} /></Labeled>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="rounded-lg border border-black/10 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="show_price" defaultChecked={initial ? initial.show_price !== false : true} className="accent-brand-red" /> Show the price on the website</label>
          <p className="mt-1 text-xs text-muted">With no price, or with this switched off, visitors see only “Get a Free Quote” (no price, no dates, no online booking). A hidden price is never sent to the public site.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="featured" defaultChecked={initial?.featured} className="accent-brand-red" /> Featured on homepage</label>
        {(collections.data?.data.length ?? 0) > 0 && (
          <fieldset>
            <legend className="mb-1 text-xs font-semibold">Show on landing pages</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {collections.data?.data.map((c) => (
                <label key={c.tag} className="flex items-center gap-2">
                  <input type="checkbox" checked={tags.includes(c.tag)} onChange={(e) => setTags(e.target.checked ? [...tags, c.tag] : tags.filter((t) => t !== c.tag))} className="accent-brand-red" /> {c.title}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <Labeled label={canPublish ? "Status" : "Status (only an Admin can publish)"} id="t-status" error={e1("status")}>
          <select id="t-status" name="status" defaultValue={initial?.status ?? "draft"} disabled={!canPublish} className={field}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Labeled>
      </div>

      {msg && <p role="status" className={`text-sm ${msg === "Saved." ? "text-green-700" : "text-brand-red"}`}>{msg}</p>}
      <div className="flex gap-3">
        <button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save tour"}</button>
        {initial && canDelete && <button type="button" onClick={remove} className={ghostBtn}>Delete</button>}
      </div>
    </form>
  );
}

function VariantsAndBatches({ tour, reload }: { tour: TourFull; reload: () => void }) {
  const { user } = useAuth();
  const manage = can(user, "tours.manage");
  const [msg, setMsg] = useState<string | null>(null);

  async function call(path: string, method: string, body?: unknown) {
    setMsg(null);
    try {
      await apiFetch(path, { method, body });
      reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? (Object.values(err.errors)[0]?.[0] ?? err.message) : "Failed.");
    }
  }

  async function add(e: FormEvent<HTMLFormElement>, path: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const body = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, ["price", "original_price", "capacity"].includes(k) ? (x === "" ? null : Number(x)) : x]));
    await call(path, "POST", body);
    form.reset();
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {msg && <p role="alert" className="text-sm text-brand-red lg:col-span-2">{msg}</p>}

      <section className="rounded-card bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-extrabold">Price options</h2>
        <ul className="space-y-2">
          {(tour.variants ?? []).map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 rounded-lg border border-black/10 p-3 text-sm">
              <span><span className="font-semibold">{x.label}</span><br /><span className="text-muted">{formatINR(x.price)}{x.original_price ? ` (was ${formatINR(x.original_price)})` : ""}</span></span>
              {manage && <button onClick={() => { const p = prompt("New price (₹)", String(x.price)); if (p) void call(`admin/variants/${x.id}`, "PUT", { price: Number(p) }); }} className="text-brand-red">Edit price</button>}
              {manage && <button onClick={() => confirm("Delete this option?") && void call(`admin/variants/${x.id}`, "DELETE")} className="text-muted hover:text-brand-red">Delete</button>}
            </li>
          ))}
          {(tour.variants ?? []).length === 0 && <li className="text-sm text-muted">No options yet — the starting price applies.</li>}
        </ul>
        {manage && (
          <form onSubmit={(e) => add(e, `admin/tours/${tour.id}/variants`)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
            <input name="label" required placeholder="e.g. Deluxe, twin sharing" aria-label="Option label" className={field} />
            <input name="price" type="number" min={1} required placeholder="₹ price" aria-label="Option price" className={field} />
            <button className={primaryBtn}>Add</button>
          </form>
        )}
      </section>

      <section className="rounded-card bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-extrabold">Departures</h2>
        <ul className="space-y-2">
          {(tour.batches ?? []).map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 p-3 text-sm">
              <span><span className="font-semibold">{formatDate(b.starts_on)}</span> – {formatDate(b.ends_on)}<br /><span className="text-muted">{b.seats_booked}/{b.capacity} seats booked</span></span>
              <span className="flex items-center gap-3">
                <Status value={b.status} />
                {manage && <button onClick={() => { const c = prompt("New capacity", String(b.capacity)); if (c) void call(`admin/batches/${b.id}`, "PUT", { capacity: Number(c) }); }} className="text-brand-red">Capacity</button>}
                {manage && <button onClick={() => void call(`admin/batches/${b.id}`, "PUT", { status: b.status === "open" ? "sold_out" : "open" })} className="text-brand-red">{b.status === "open" ? "Mark sold out" : "Reopen"}</button>}
                {manage && <button onClick={() => confirm("Delete this departure?") && void call(`admin/batches/${b.id}`, "DELETE")} className="text-muted hover:text-brand-red">Delete</button>}
              </span>
            </li>
          ))}
          {(tour.batches ?? []).length === 0 && <li className="text-sm text-muted">No departures yet.</li>}
        </ul>
        {manage && (
          <form onSubmit={(e) => add(e, `admin/tours/${tour.id}/batches`)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_5rem_auto]">
            <input name="starts_on" type="date" required aria-label="Start date" className={field} />
            <input name="ends_on" type="date" required aria-label="End date" className={field} />
            <input name="capacity" type="number" min={1} required placeholder="Seats" aria-label="Seats" className={field} />
            <button className={primaryBtn}>Add</button>
          </form>
        )}
      </section>
    </div>
  );
}

type TourCategory = {
  slug: string; title: string; tag: string; intro: string; tours_count: number; published_count: number;
  tours: { id: number; title: string; slug: string; status: string; destination: string }[];
};

/** Read-only overview of the tag-driven landing pages (config/collections.php on the API). To move a tour in or out of a category, edit its tags on the tour itself. */
export function TourCategoriesView() {
  const { data, loading } = useApi<{ data: TourCategory[] }>("admin/tour-categories");

  return (
    <>
      <Title title="Tour categories" sub="What's live on each collections landing page — edit a tour's tags to change its categories" />
      {loading && <p className="text-muted">Loading…</p>}
      <div className="space-y-4">
        {(data?.data ?? []).map((c) => (
          <section key={c.slug} className="rounded-card bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">{c.title}</h2>
                <p className="text-sm text-muted">{c.intro}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <Badge tone="blue">{c.published_count} published</Badge>
                {c.tours_count > c.published_count && <Badge tone="amber">{c.tours_count - c.published_count} draft</Badge>}
              </div>
            </div>
            {c.tours.length === 0 ? (
              <p className="text-sm text-muted">No tours tagged &ldquo;{c.tag}&rdquo; yet.</p>
            ) : (
              <ul className="divide-y divide-black/5 text-sm">
                {c.tours.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/tours/${t.id}`} className="flex items-center justify-between gap-3 py-2 hover:text-brand-red">
                      <span><span className="font-semibold">{t.title}</span> <span className="text-muted">· {t.destination}</span></span>
                      <Status value={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
