import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Play } from "lucide-react";
import type { MenuCountry } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { CoverImage } from "../CoverImage";
import { OpenQuoteButton } from "../LeadModal";
import { Rail } from "./Rail";
import { Reveal } from "./Reveal";

const tones = {
  light: { bg: "bg-white", kicker: "text-brand-red", blurb: "text-muted" },
  rose: { bg: "bg-gradient-to-b from-rose-50 to-white", kicker: "text-rose-600", blurb: "text-muted" },
  sand: { bg: "bg-amber-50/70", kicker: "text-amber-700", blurb: "text-muted" },
} as const;

/** Text on the left, a swipeable row of tall photo cards on the right. */
export function RailSection({ tone = "light", kicker, lead, accent, blurb, href, cta, label, children }: {
  tone?: keyof typeof tones; kicker: string; lead: string; accent: string; blurb: string; href: string; cta: string; label: string; children: ReactNode;
}) {
  const t = tones[tone];
  return (
    <section className={t.bg}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:py-20">
        <Reveal>
          <p className={`text-xs font-bold uppercase tracking-[0.3em] ${t.kicker}`}>{kicker}</p>
          <h2 className="mt-3 text-4xl font-extrabold leading-[1.05] sm:text-5xl">
            {lead} <span className="text-brand-red">{accent}</span>
          </h2>
          <p className={`mt-4 text-[15px] leading-relaxed ${t.blurb}`}>{blurb}</p>
          <Link href={href} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-red">
            {cta} <ArrowRight size={16} />
          </Link>
        </Reveal>
        <Reveal delay={120} className="min-w-0">
          <Rail label={label}>{children}</Rail>
        </Reveal>
      </div>
    </section>
  );
}

/** One country in a rail: photo, name and "starting from" price. */
export function PlaceCard({ place, href }: { place: Pick<MenuCountry, "slug" | "name" | "image_url" | "tours_count" | "menu_starting_price">; href: string }) {
  return (
    <li className="w-52 shrink-0 snap-start sm:w-56">
      <Link href={href} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl shadow-float">
        <div className="absolute inset-0"><CoverImage src={place.image_url} alt={place.name} seed={place.slug} sizes="224px" className="h-full w-full transition duration-700 group-hover:scale-110" /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="text-xl font-bold leading-tight">{place.name}</h3>
          <p className="mt-0.5 text-xs text-white/85">
            {place.tours_count} package{place.tours_count === 1 ? "" : "s"}
          </p>
          {place.menu_starting_price !== null && (
            <p className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">From {formatINR(place.menu_starting_price)}</p>
          )}
        </div>
        <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/90 text-brand-red opacity-0 transition group-hover:opacity-100">
          <ArrowRight size={16} />
        </span>
      </Link>
    </li>
  );
}

/** Full-width looping video with a message on top. Still image only for people who prefer reduced motion. */
export function VideoBand({ src, poster, kicker, title, text, children }: { src: string; poster: string; kicker: string; title: string; text: string; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt="" className="h-full w-full object-cover" />
        <video className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden" src={src} poster={poster} autoPlay muted loop playsInline preload="none" aria-hidden />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
      <div className="mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:min-h-[32rem] lg:px-8">
        <Reveal>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-white/85">
            <Play size={14} className="fill-white" aria-hidden /> {kicker}
          </p>
          <h2 className="mt-3 max-w-xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">{title}</h2>
          <p className="mt-4 max-w-md text-white/90">{text}</p>
          {children}
        </Reveal>
      </div>
    </section>
  );
}

export function QuoteButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <OpenQuoteButton className={`inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3.5 font-semibold text-white shadow-lg transition hover:bg-brand-red-dark ${className}`}>
      {children}
    </OpenQuoteButton>
  );
}
