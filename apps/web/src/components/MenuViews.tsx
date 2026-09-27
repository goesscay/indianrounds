import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { CategorySummary, Destination, MenuCountry, MenuSlug, Tour } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { CoverImage } from "./CoverImage";
import { DestinationCard } from "./DestinationCard";
import { OpenQuoteButton } from "./LeadModal";
import { SectionHeading } from "./SectionHeading";
import { TourCard } from "./TourCard";

const menuTitles: Record<MenuSlug, string> = { destinations: "Destinations", "group-tours": "Group Tours", "weekend-escapes": "Weekend Escapes", honeymoon: "Honeymoon" };

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-sm text-white/85">
      <ol className="flex flex-wrap items-center gap-1">
        <li><Link href="/" className="hover:underline">Home</Link></li>
        {items.map((c) => (
          <li key={c.label} className="flex items-center gap-1">
            <ChevronRight size={14} aria-hidden />
            {c.href ? <Link href={c.href} className="hover:underline">{c.label}</Link> : <span aria-current="page" className="font-semibold text-white">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Hero({ crumbs, title, sub, children }: { crumbs: Crumb[]; title: string; sub?: string | null; children?: ReactNode }) {
  return (
    <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl font-extrabold sm:text-5xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-white/90">{sub}</p>}
        {children}
      </div>
    </section>
  );
}

export function CategoryCard({ href, category }: { href: string; category: CategorySummary }) {
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-card bg-white shadow-float transition hover:-translate-y-0.5">
      <CoverImage src={category.image_url} alt={category.name} seed={category.slug} className="aspect-[4/3] transition duration-500 group-hover:scale-105" />
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-bold group-hover:text-brand-red">{category.name}</h3>
        {category.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{category.description}</p>}
        <p className="mt-auto pt-3 text-sm font-semibold text-brand-red">{category.tours_count} package{category.tours_count === 1 ? "" : "s"} <span aria-hidden>→</span></p>
      </div>
    </Link>
  );
}

/** /group-tours, /weekend-escapes, /honeymoon: the countries that have packages in this menu. */
export function MenuCountriesView({ menu, title, intro, countries }: { menu: MenuSlug; title: string; intro: string; countries: MenuCountry[] }) {
  return (
    <>
      <Hero crumbs={[{ label: title }]} title={title} sub={intro} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading lead="Choose a" accent="Country" sub={`${countries.length} destination${countries.length === 1 ? "" : "s"} with ${title.toLowerCase()}`} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {countries.map((d) => (
            <DestinationCard key={d.slug} destination={d} href={`/${menu}/${d.slug}`} note={`${d.tours_count} package${d.tours_count === 1 ? "" : "s"} from ${formatINR(d.menu_starting_price)}`} />
          ))}
        </div>
      </div>
    </>
  );
}

/** A country inside a menu: its categories. */
export function MenuCountryView({ menu, destination, categories }: { menu: MenuSlug; destination: Destination & { best_time: string | null; about: string | null }; categories: CategorySummary[] }) {
  const title = menuTitles[menu];
  const base = `/${menu}/${destination.slug}`;

  return (
    <>
      <Hero
        crumbs={menu === "destinations" ? [{ label: "Destinations", href: "/destinations" }, { label: destination.name }] : [{ label: title, href: `/${menu}` }, { label: destination.name }]}
        title={`${destination.name} ${menu === "destinations" ? "Tour Packages" : title}`}
        sub={destination.tagline}
      >
        <OpenQuoteButton options={{ destination: destination.name, title: `Plan your ${destination.name} trip` }} className="mt-6 rounded-full bg-white px-7 py-3 font-semibold text-brand-red hover:bg-white/90">
          Get a Free Quote
        </OpenQuoteButton>
      </Hero>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading lead="Browse by" accent="Category" sub={`${categories.length} categor${categories.length === 1 ? "y" : "ies"} in ${destination.name}`} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <CategoryCard key={c.slug} href={`${base}/${c.slug}`} category={c} />
          ))}
        </div>
        {(destination.about || destination.best_time) && (
          <section className="mt-14 max-w-3xl space-y-3">
            <h2 className="text-2xl font-extrabold">About {destination.name}</h2>
            {destination.about && <p className="text-muted">{destination.about}</p>}
            {destination.best_time && <p className="text-muted"><strong className="text-ink">Best time to visit:</strong> {destination.best_time}</p>}
          </section>
        )}
      </div>
    </>
  );
}

/** A category: its packages. */
export function MenuCategoryView({ menu, destination, category, tours }: { menu: MenuSlug; destination: Destination; category: { name: string; slug: string; description: string | null }; tours: Tour[] }) {
  const title = menuTitles[menu];
  const country = `/${menu}/${destination.slug}`;

  return (
    <>
      <Hero
        crumbs={[
          menu === "destinations" ? { label: "Destinations", href: "/destinations" } : { label: title, href: `/${menu}` },
          { label: destination.name, href: country },
          { label: category.name },
        ]}
        title={`${destination.name}: ${category.name}`}
        sub={category.description}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading lead={category.name} accent="Packages" sub={`${tours.length} package${tours.length === 1 ? "" : "s"} available`} href={country} cta={`All ${destination.name} categories`} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tours.map((t) => (
            <TourCard key={t.slug} tour={t} />
          ))}
        </div>
      </div>
    </>
  );
}
