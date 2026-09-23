import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/lib/site";
import type { Destination } from "@/lib/api";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/destinations", label: "Destinations" },
  { href: "/tours", label: "Tours" },
  { href: "/offers", label: "Special Offers" },
  { href: "/blog", label: "Travel Stories" },
  { href: "/about", label: "About Us" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter({ destinations }: { destinations: Destination[] }) {
  return (
    <footer className="bg-footer text-white/85">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr] lg:px-8">
        <div className="space-y-4">
          <Image src="/brand/logo-footer.png" alt="Indian Rounds" width={200} height={41} className="h-10 w-auto" />
          <p className="max-w-xs text-sm text-white/70">Your trusted travel partner for unforgettable journeys. Explore India and the world with Indian Rounds.</p>
          <ul className="flex gap-3">
            {site.socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid size-9 place-items-center rounded-full border border-white/30 text-xs font-bold hover:bg-brand-red">
                  {s.label[0]}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-bold text-white">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-bold text-white">Popular Destinations</h3>
          <ul className="space-y-2 text-sm">
            {destinations.slice(0, 6).map((d) => (
              <li key={d.slug}>
                <Link href={`/destinations/${d.slug}`} className="hover:text-white">{d.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-bold text-white">Contact Us</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><Phone size={18} className="mt-0.5 shrink-0" /> <a href={site.phoneHref}>{site.phone}</a></li>
            <li className="flex gap-3"><Mail size={18} className="mt-0.5 shrink-0" /> <a href={`mailto:${site.email}`}>{site.email}</a></li>
            <li className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0" /> {site.address}</li>
            <li className="flex gap-3"><Clock size={18} className="mt-0.5 shrink-0" /> {site.hours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-white/60 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Indian Rounds. All Rights Reserved.</p>
          <ul className="flex flex-wrap gap-4">
            <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link href="/disclaimer" className="hover:text-white">Disclaimer</Link></li>
            <li><Link href="/customer-support" className="hover:text-white">Customer Support</Link></li>
            <li><Link href="/sitemap.xml" className="hover:text-white">Sitemap</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
