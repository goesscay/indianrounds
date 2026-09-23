import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Phone } from "lucide-react";
import { getDestinations } from "@/lib/api";
import { categoryNavLinks, moreLinks, site, topNavLinks } from "@/lib/site";
import { AuthMenu } from "./AuthMenu";
import { DestinationsMegaMenu } from "./DestinationsMegaMenu";
import { MobileNav } from "./MobileNav";

export async function SiteHeader() {
  const destinations = await getDestinations();

  return (
    <header className="sticky top-0 z-50">
      {/* Top bar: compact, right-aligned utility navigation. */}
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Indian Rounds home" className="flex items-center">
            <Image src="/brand/logo-header.png" alt="Indian Rounds — Travel Beyond Borders" width={172} height={35} priority className="h-8 w-auto sm:h-9" />
          </Link>

          <div className="hidden items-center gap-5 lg:flex">
            <nav aria-label="Utility" className="flex items-center gap-5">
              {topNavLinks.map((l) => (
                <Link key={l.label} href={l.href} className="text-[13px] font-semibold text-ink/75 transition hover:text-brand-red">
                  {l.label}
                </Link>
              ))}
            </nav>
            <span className="h-4 w-px bg-black/10" aria-hidden />
            <a href={site.phoneHref} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink/75 transition hover:text-brand-red">
              <Phone size={14} className="text-brand-red" />
              {site.phone}
            </a>
            <span className="h-4 w-px bg-black/10" aria-hidden />
            <AuthMenu />
          </div>

          <MobileNav />
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
