import type { ReactNode } from "react";
import { Banknote, CalendarDays, Car, CheckCircle2, ChevronDown, Clock, CloudSun, Compass, Heart, Landmark, Languages, MapPin, MessageCircle, Phone, Plane, ShieldCheck, Sparkles, Utensils, Wallet, Stethoscope, IdCard } from "lucide-react";
import type { Destination, DestinationFact, ProfileItem } from "@/lib/api";
import { site } from "@/lib/site";
import { formatINR } from "@/lib/format";
import { Breadcrumbs } from "./MenuViews";
import { CoverImage } from "./CoverImage";
import { OpenQuoteButton } from "./LeadModal";

/** Everything on a destination page that comes from the written profile (admin: Destinations > edit). */

const factMeta: { key: DestinationFact; label: string; icon: typeof Landmark }[] = [
  { key: "capital", label: "Capital", icon: Landmark },
  { key: "currency", label: "Currency", icon: Banknote },
  { key: "languages", label: "Languages", icon: Languages },
  { key: "time_zone", label: "Time zone", icon: Clock },
  { key: "calling_code", label: "Calling code", icon: Phone },
  { key: "driving_side", label: "Driving side", icon: Car },
  { key: "climate", label: "Climate", icon: CloudSun },
  { key: "flight_time", label: "Flight from India", icon: Plane },
];

const reasonIcons = [Sparkles, Heart, ShieldCheck, Compass];

const anchor ="scroll-mt-32 lg:scroll-mt-[156px]";

function paragraphs(text?: string) {
  return (text ?? "").split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
}

function Heading({ lead, accent, sub }: { lead: string; accent: string; sub?: string }) {
  return (
    <div className="mb-6 max-w-3xl">
      <h2 className="text-2xl font-extrabold sm:text-3xl">
        {lead} <span className="text-brand-red">{accent}</span>
      </h2>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function sectionsOf(d: Destination, hasPackages: boolean) {
  const c = d.seo_content ?? {};
  return {
    overview: Boolean(c.overview || c.reasons?.length || Object.values(c.facts ?? {}).some(Boolean)),
    season: Boolean(c.seasons && Object.keys(c.seasons).length),
    packages: hasPackages,
    attractions: Boolean(c.attractions?.length),
    experiences: Boolean(c.experiences?.length || c.food?.length),
    tips: Boolean(c.tips?.length || Object.values(c.travel_info ?? {}).some(Boolean)),
    faqs: Boolean(c.faqs?.length),
  };
}

export function DestinationHero({ destination: d, packageCount }: { destination: Destination; packageCount: number }) {
  const facts = d.seo_content?.facts;
  const chips: { icon: typeof Landmark; text: string }[] = [];
  if (d.best_time) chips.push({ icon: CalendarDays, text: `Best time: ${d.best_time}` });
  if (facts?.flight_time) chips.push({ icon: Plane, text: facts.flight_time.replace(/^About /, "~") });
  if (packageCount > 0) chips.push({ icon: Compass, text: `${packageCount} package${packageCount === 1 ? "" : "s"}` });

  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 -z-10">
        <CoverImage src={d.image_url} alt={`${d.name} travel`} seed={d.slug} className="h-full w-full" sizes="100vw" />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/50 to-black/30" aria-hidden />
      <div className="mx-auto flex min-h-[22rem] max-w-7xl flex-col justify-end px-4 pb-10 pt-12 sm:min-h-[26rem] sm:px-6 lg:min-h-[30rem] lg:px-8 lg:pb-14">
        <Breadcrumbs items={[{ label: "Destinations", href: "/destinations" }, { label: d.name }]} />
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">{d.region === "india" ? "India" : "International"}</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight sm:text-6xl">{d.name} Tour Packages</h1>
        {d.tagline && <p className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg">{d.tagline}</p>}
        {chips.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            {chips.map((c) => (
              <li key={c.text} className="flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur">
                <c.icon size={16} aria-hidden /> {c.text}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <OpenQuoteButton options={{ destination: d.name, title: `Plan your ${d.name} trip` }} className="rounded-full bg-brand-red px-7 py-3 font-semibold text-white shadow-lg hover:bg-brand-red-dark">
            Get a Free Quote
          </OpenQuoteButton>
          <a
            href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Hi Indian Rounds, I'd like help planning a trip to ${d.name}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3 font-semibold text-white hover:bg-white hover:text-brand-red"
          >
            <MessageCircle size={18} aria-hidden /> Chat on WhatsApp
          </a>
          {d.starting_price ? <p className="text-sm text-white/90">Packages from <strong className="text-base">{formatINR(d.starting_price)}</strong> per person</p> : null}
        </div>
      </div>
    </section>
  );
}

export function DestinationNav({ name, sections }: { name: string; sections: ReturnType<typeof sectionsOf> }) {
  const items = [
    { id: "overview", label: "Overview", on: sections.overview },
    { id: "season", label: "When to go", on: sections.season },
    { id: "packages", label: "Packages", on: sections.packages },
    { id: "attractions", label: "Attractions", on: sections.attractions },
    { id: "experiences", label: "Experiences & food", on: sections.experiences },
    { id: "tips", label: "Travel tips", on: sections.tips },
    { id: "faqs", label: "FAQs", on: sections.faqs },
  ].filter((i) => i.on);
  if (items.length < 2) return null;

  return (
    <nav aria-label={`${name} sections`} className="sticky top-16 z-30 border-b border-black/10 bg-white sm:top-[72px] lg:top-[109px]">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a href={`#${i.id}`} className="block border-b-2 border-transparent px-3 py-3.5 text-sm font-semibold text-muted hover:border-brand-red hover:text-brand-red">
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Overview text, quick facts and the reasons to go. */
export function DestinationOverview({ destination: d }: { destination: Destination }) {
  const c = d.seo_content ?? {};
  const facts = factMeta.filter((f) => c.facts?.[f.key]);
  const text = paragraphs(c.overview);
  if (text.length === 0 && facts.length === 0 && !c.reasons?.length) return null;

  return (
    <section id="overview" className={`${anchor} space-y-10`}>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div>
          <Heading lead="All you need to know about" accent={d.name} />
          <div className="space-y-4 text-[17px] leading-relaxed text-ink/85">
            {text.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
          </div>
          {c.places && (
            <p className="mt-5 flex items-start gap-2 rounded-lg bg-surface-alt px-4 py-3 text-sm">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand-red" aria-hidden />
              <span><strong>Places covered:</strong> {c.places}</span>
            </p>
          )}
        </div>
        {facts.length > 0 && (
          <aside aria-label={`${d.name} at a glance`} className="rounded-card border border-black/10 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-extrabold">{d.name} at a glance</h3>
            <dl className="mt-3 divide-y divide-black/10">
              {facts.map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-start gap-3 py-2.5">
                  <Icon size={18} className="mt-0.5 shrink-0 text-brand-red" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
                    <dd className="text-sm font-medium">{c.facts![key]}</dd>
                  </div>
                </div>
              ))}
              {d.best_time && (
                <div className="flex items-start gap-3 py-2.5">
                  <CalendarDays size={18} className="mt-0.5 shrink-0 text-brand-red" aria-hidden />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Best season</dt>
                    <dd className="text-sm font-medium">{d.best_time}</dd>
                  </div>
                </div>
              )}
            </dl>
          </aside>
        )}
      </div>

      {c.reasons && c.reasons.length > 0 && (
        <div>
          <Heading lead="Top reasons to choose" accent={`${d.name} tour packages`} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.reasons.map((r, i) => {
              const Icon = reasonIcons[i % reasonIcons.length];
              return (
                <li key={r.title} className="rounded-card border border-black/10 bg-white p-5 shadow-sm">
                  <span className="grid size-10 place-items-center rounded-full bg-brand-red/10 text-brand-red"><Icon size={20} aria-hidden /></span>
                  <h3 className="mt-3 font-bold">{r.title}</h3>
                  {r.text && <p className="mt-1 text-sm text-muted">{r.text}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function Cards({ items, numbered = false }: { items: ProfileItem[]; numbered?: boolean }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a, i) => (
        <li key={a.title} className="group flex gap-4 rounded-card border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-float">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-red text-sm font-bold text-white" aria-hidden>{numbered ? i + 1 : <CheckCircle2 size={18} />}</span>
          <div>
            <h3 className="font-bold group-hover:text-brand-red">{a.title}</h3>
            {a.text && <p className="mt-1 text-sm text-muted">{a.text}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DestinationAttractions({ destination: d }: { destination: Destination }) {
  const items = d.seo_content?.attractions;
  if (!items?.length) return null;
  return (
    <section id="attractions" className={anchor}>
      <Heading lead={`Top attractions in`} accent={d.name} sub="Places most travellers want on their list" />
      <Cards items={items} numbered />
    </section>
  );
}

export function DestinationExperiences({ destination: d }: { destination: Destination }) {
  const { experiences, food } = d.seo_content ?? {};
  if (!experiences?.length && !food?.length) return null;
  return (
    <section id="experiences" className={`${anchor} space-y-12`}>
      {experiences && experiences.length > 0 && (
        <div>
          <Heading lead="Experiences &" accent="things to do" sub={`The activities that make your trip to ${d.name} memorable`} />
          <Cards items={experiences} />
        </div>
      )}
      {food && food.length > 0 && (
        <div>
          <Heading lead="Foods to" accent="try" sub="Eat like a local, with vegetarian and Indian options in mind" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {food.map((f) => (
              <li key={f.title} className="rounded-card bg-surface-alt p-5">
                <Utensils size={20} className="text-brand-red" aria-hidden />
                <h3 className="mt-2 font-bold">{f.title}</h3>
                {f.text && <p className="mt-1 text-sm text-muted">{f.text}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Accordion({ icon, title, children, open = false }: { icon?: ReactNode; title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-card border border-black/10 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-bold marker:hidden [&::-webkit-details-marker]:hidden">
        {icon && <span className="text-brand-red" aria-hidden>{icon}</span>}
        <span className="flex-1">{title}</span>
        <ChevronDown size={20} className="shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-black/10 px-5 py-4 text-sm leading-relaxed text-ink/85">{children}</div>
    </details>
  );
}

export function DestinationTips({ destination: d }: { destination: Destination }) {
  const { tips, travel_info: info } = d.seo_content ?? {};
  const infoItems = [
    { key: "visa", title: "Visa information", icon: <IdCard size={20} />, text: info?.visa },
    { key: "health", title: "Health and safety tips", icon: <Stethoscope size={20} />, text: info?.health },
    { key: "money", title: "Currency and tipping", icon: <Wallet size={20} />, text: info?.money },
  ].filter((i) => i.text);
  if (!tips?.length && infoItems.length === 0) return null;

  return (
    <section id="tips" className={`${anchor} grid gap-10 lg:grid-cols-2`}>
      {tips && tips.length > 0 && (
        <div>
          <Heading lead="Essential tips for travelling to" accent={d.name} />
          <ul className="space-y-3">
            {tips.map((t) => (
              <li key={t.title} className="flex gap-3 rounded-lg border-l-4 border-brand-red bg-surface-alt px-4 py-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-red" aria-hidden />
                <div>
                  <p className="font-semibold">{t.title}</p>
                  {t.text && <p className="text-sm text-muted">{t.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {infoItems.length > 0 && (
        <div>
          <Heading lead="Before you" accent="go" sub="Rules change, so we confirm the latest details when you book" />
          <div className="space-y-3">
            {infoItems.map((i, n) => (
              <Accordion key={i.key} icon={i.icon} title={i.title} open={n === 0}>
                {paragraphs(i.text).map((p) => <p key={p.slice(0, 30)}>{p}</p>)}
              </Accordion>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function DestinationFaqs({ destination: d }: { destination: Destination }) {
  const faqs = d.seo_content?.faqs;
  if (!faqs?.length) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <section id="faqs" className={`${anchor} max-w-3xl`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Heading lead={`${d.name} travel`} accent="FAQs" sub="Quick answers to what travellers ask us most" />
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <Accordion key={f.q} title={f.q} open={i === 0}>
            <p>{f.a}</p>
          </Accordion>
        ))}
      </div>
    </section>
  );
}

export function DestinationCta({ destination: d }: { destination: Destination }) {
  return (
    <section className="overflow-hidden rounded-card bg-gradient-to-r from-brand-red-dark to-brand-red p-8 text-white sm:p-10">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Plan your {d.name} trip with us</h2>
          <p className="mt-1 text-white/90">Tell us your dates, group size and budget. We will send a tailored itinerary and quote, usually within a few hours.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <OpenQuoteButton options={{ destination: d.name, title: `Plan your ${d.name} trip` }} className="rounded-full bg-white px-7 py-3 font-semibold text-brand-red hover:bg-white/90">
            Get a Free Quote
          </OpenQuoteButton>
          <a href={site.phoneHref} className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3 font-semibold hover:bg-white hover:text-brand-red">
            <Phone size={18} aria-hidden /> {site.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
