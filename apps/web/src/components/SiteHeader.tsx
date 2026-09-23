import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Headset, Search } from "lucide-react";
import { getDestinations } from "@/lib/api";
import { categoryNavLinks, moreLinks, site, topNavLinks } from "@/lib/site";
import { AuthMenu } from "./AuthMenu";
import { DestinationsMegaMenu } from "./DestinationsMegaMenu";
import { OpenQuoteButton } from "./LeadModal";
import { MobileNav } from "./MobileNav";

export async function SiteHeader() {
  const destinations = await getDestinations();

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar: utility links, contact and account. */}
      <div className="border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-stretch justify-between gap-4 pr-4 sm:h-[72px] sm:pr-6 lg:pr-8">
          <Link href="/" aria-label="Indian Rounds home" className="flex items-center bg-brand-red pl-4 pr-10 [clip-path:polygon(0_0,100%_0,calc(100%-28px)_100%,0_100%)] sm:pl-6">
            <Image src="/brand/logo.jpeg" alt="Indian Rounds — Travel Beyond Borders" width={170} height={50} priority className="h-10 w-auto sm:h-12" />
          </Link>

          <nav aria-label="Account" className="hidden items-center gap-6 lg:flex">
            {topNavLinks.map((l) => (
              <Link key={l.label} href={l.href} className="text-sm font-semibold transition hover:text-brand-red">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-5">
            <a href={site.phoneHref} className="hidden items-center gap-2 xl:flex">
              <Headset className="text-brand-red" size={24} />
              <span className="leading-tight">
                <span className="block text-sm font-bold">{site.phone}</span>
                <span className="block text-[11px] text-muted">Talk to our Travel Expert</span>
              </span>
            </a>
            <Link href="/tours" aria-label="Search tours" className="hidden rounded-full p-2 hover:bg-surface-alt sm:block">
              <Search size={20} />
            </Link>
            <AuthMenu />
            <OpenQuoteButton className="hidden rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red-dark sm:block">
              Plan My Trip
            </OpenQuoteButton>
            <MobileNav />
          </div>
        </div>
      </div>

      {/* Second bar: the catalogue / category navigation. */}
      <div className="hidden bg-brand-red lg:block">
        <nav aria-label="Categories" className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4 py-3 sm:px-6 lg:px-8">
          <DestinationsMegaMenu destinations={destinations} />
          {categoryNavLinks.filter((l) => l.label !== "Destinations").map((l) => (
            <Link key={l.label} href={l.href} className="text-sm font-semibold text-white/90 transition hover:text-white">
              {l.label}
            </Link>
          ))}
          <div className="group relative">
            <button type="button" aria-haspopup="true" className="flex items-center gap-1 text-sm font-semibold text-white/90 transition hover:text-white">
              More <ChevronDown size={14} />
            </button>
            <ul className="invisible absolute right-0 top-full z-50 w-56 rounded-xl border border-black/5 bg-white py-2 opacity-0 shadow-float transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {moreLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt hover:text-brand-red">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
}
