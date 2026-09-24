import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Check, MapPin, X } from "lucide-react";
import { getTour } from "@/lib/api";
import { durationLabel, formatDate, formatINR } from "@/lib/format";
import { site } from "@/lib/site";
import { CoverImage } from "@/components/CoverImage";
import { OpenQuoteButton } from "@/components/LeadModal";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTour(slug);
  if (!t) return { title: "Tour not found" };
  return {
    title: t.title,
    description: t.summary ?? `${t.title} — ${durationLabel(t.duration_nights, t.duration_days)} from ${formatINR(t.price)} per person.`,
    alternates: { canonical: `/tours/${t.slug}` },
  };
}

const tabs = [
  ["overview", "Overview"],
  ["itinerary", "Itinerary"],
  ["inclusions", "Inclusions"],
  ["exclusions", "Exclusions"],
  ["other-info", "Other Info"],
] as const;

export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTour(slug);
  if (!t) notFound();

  const upcoming = (t.batches ?? []).filter((b) => b.status === "open").slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: t.title,
    description: t.summary,
    touristType: t.tour_type === "group" ? "Group" : "Custom",
    itinerary: (t.itinerary ?? []).map((d) => ({ "@type": "TouristAttraction", name: d.title, description: d.description })),
    offers: { "@type": "Offer", price: t.price, priceCurrency: "INR", url: `${site.url}/tours/${t.slug}`, availability: upcoming.length ? "https://schema.org/InStock" : "https://schema.org/SoldOut" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative">
        <CoverImage src={t.image_url} alt={t.title} seed={t.slug} className="h-64 sm:h-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-4 pb-6 text-white sm:px-6 lg:px-8">
            <div className="mb-2 flex flex-wrap gap-2 text-xs font-semibold">
              {t.destination && <Link href={`/destinations/${t.destination.slug}`} className="rounded-full bg-brand-red px-3 py-1">{t.destination.name}</Link>}
              <span className="rounded-full bg-white/20 px-3 py-1">{durationLabel(t.duration_nights, t.duration_days)}</span>
              <span className="rounded-full bg-white/20 px-3 py-1 capitalize">{t.tour_type} tour</span>
            </div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{t.title}</h1>
          </div>
        </div>
      </section>

      <nav aria-label="Tour sections" className="sticky top-16 z-30 border-b border-black/10 bg-white sm:top-[72px] lg:top-[109px]">
        <ul className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 text-sm font-semibold sm:px-6 lg:px-8">
          {tabs.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block whitespace-nowrap border-b-2 border-transparent py-3 hover:border-brand-red hover:text-brand-red">{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
        <div className="space-y-12">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Duration", durationLabel(t.duration_nights, t.duration_days)],
              ["Pickup", t.pickup ?? "—"],
              ["Drop", t.drop_point ?? "—"],
              ["Type", t.haul_class === "long" ? "International (long-haul)" : "Short-haul"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-card bg-surface-alt p-4">
                <p className="text-xs text-muted">{k}</p>
                <p className="font-semibold">{v}</p>
              </div>
            ))}
          </div>

          <section id="overview" className="scroll-mt-32 lg:scroll-mt-[156px] space-y-4">
            <h2 className="text-2xl font-extrabold">Overview &amp; Highlights</h2>
            <p className="text-muted">{t.overview}</p>
            <ul className="flex flex-wrap gap-2">
              {(t.highlights ?? []).map((h) => (
                <li key={h} className="rounded-full border border-brand-red/30 bg-brand-red/5 px-3 py-1 text-sm font-medium text-brand-red">{h}</li>
              ))}
            </ul>
          </section>

          <section id="itinerary" className="scroll-mt-32 lg:scroll-mt-[156px]">
            <h2 className="mb-4 text-2xl font-extrabold">Itinerary</h2>
            <div className="space-y-3">
              {(t.itinerary ?? []).map((d, i) => (
                <details key={d.day} open={i === 0} className="group rounded-card border border-black/10 bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-semibold">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-red text-sm text-white">{d.day}</span>
                    Day {d.day}: {d.title}
                  </summary>
                  <p className="border-t border-black/5 px-4 pb-4 pt-3 text-sm text-muted">{d.description}</p>
                </details>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Weather, road conditions and safety may require changes to the itinerary.</p>
          </section>

          <section id="inclusions" className="scroll-mt-32 lg:scroll-mt-[156px]">
            <h2 className="mb-4 text-2xl font-extrabold">Inclusions</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {(t.inclusions ?? []).map((x) => (
                <li key={x} className="flex gap-2 text-sm"><Check size={18} className="mt-0.5 shrink-0 text-green-600" />{x}</li>
              ))}
            </ul>
          </section>

          <section id="exclusions" className="scroll-mt-32 lg:scroll-mt-[156px]">
            <h2 className="mb-4 text-2xl font-extrabold">Exclusions</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {(t.exclusions ?? []).map((x) => (
                <li key={x} className="flex gap-2 text-sm"><X size={18} className="mt-0.5 shrink-0 text-brand-red" />{x}</li>
              ))}
            </ul>
          </section>

          <section id="other-info" className="scroll-mt-32 lg:scroll-mt-[156px] space-y-6">
            <h2 className="text-2xl font-extrabold">Other Info</h2>
            {(t.must_carry?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 font-bold">Must carry</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted">
                  {t.must_carry!.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
            )}
            {(t.notes?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 font-bold">Notes</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted">
                  {t.notes!.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
            )}
            <p className="text-sm text-muted">See our <Link href="/terms" className="text-brand-red underline">Terms &amp; Conditions</Link> for payment and cancellation rules.</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[156px] lg:self-start">
          <div className="rounded-card border border-black/10 bg-white p-5 shadow-float">
            <p className="text-xs text-muted">Starting from</p>
            <p className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-brand-red">{formatINR(t.price)}</span>
              {t.original_price && <span className="text-sm text-muted line-through">{formatINR(t.original_price)}</span>}
            </p>
            <p className="text-xs text-muted">per person · 5% GST extra</p>

            {upcoming.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt px-3 py-2">
                    <span className="flex items-center gap-2"><CalendarDays size={16} className="text-brand-red" />{formatDate(b.starts_on)}</span>
                    <span className={b.seats_left <= 4 ? "text-xs font-semibold text-brand-red" : "text-xs text-muted"}>{b.seats_left <= 4 ? `${b.seats_left} left` : "Open"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-lg bg-surface-alt p-3 text-sm text-muted">No open departures right now — request a custom date.</p>
            )}

            <Link href={`/tours/${t.slug}/dates`} className="mt-5 block rounded-full bg-brand-red px-6 py-3 text-center font-semibold text-white hover:bg-brand-red-dark">
              Check Dates &amp; Costing
            </Link>
            <OpenQuoteButton options={{ destination: t.destination?.name, message: `I'm interested in: ${t.title}`, title: "Enquire about this tour" }} className="mt-3 w-full rounded-full border border-brand-red px-6 py-3 font-semibold text-brand-red hover:bg-brand-red/5">
              Get a Free Quote
            </OpenQuoteButton>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted"><MapPin size={14} /> Pickup: {t.pickup ?? "—"}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
