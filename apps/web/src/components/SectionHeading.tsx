import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Two-tone heading used across the site: black lead word(s) + red accent word(s). */
export function SectionHeading({ lead, accent, sub, href, cta }: { lead: string; accent: string; sub?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-3xl font-extrabold sm:text-4xl">
          {lead} <span className="text-brand-red">{accent}</span>
        </h2>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-2 rounded-full border border-brand-red px-5 py-2 text-sm font-semibold text-brand-red transition hover:bg-brand-red hover:text-white">
          {cta ?? "View All"} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
