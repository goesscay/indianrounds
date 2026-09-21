import Image from "next/image";
import Link from "next/link";
import { Headset, Search } from "lucide-react";
import { navLinks, site } from "@/lib/site";
import { AuthMenu } from "./AuthMenu";
import { OpenQuoteButton } from "./LeadModal";
import { MobileNav } from "./MobileNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-stretch justify-between gap-4 pr-4 sm:h-[72px] sm:pr-6 lg:pr-8">
        <Link href="/" aria-label="Indian Rounds home" className="flex items-center bg-brand-red pl-4 pr-10 [clip-path:polygon(0_0,100%_0,calc(100%-28px)_100%,0_100%)] sm:pl-6">
          <Image src="/brand/logo.jpeg" alt="Indian Rounds — Travel Beyond Borders" width={170} height={50} priority className="h-10 w-auto sm:h-12" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-semibold transition hover:text-brand-red">
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
            Plan Your Trip
          </OpenQuoteButton>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
