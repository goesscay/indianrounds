import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { FileWarning, Mail, Phone } from "lucide-react";
import { site } from "@/lib/site";
import { Breadcrumbs } from "./MenuViews";

export type LegalSection = { id: string; title: string; body: ReactNode };
export type LegalHighlight = { icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>; title: string; text: string };

const policies = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/disclaimer", label: "Disclaimer" },
];

/** Shared layout for the legal pages: header band, key points, contents list and numbered sections. */
export function LegalLayout({ title, accent, intro, path, highlights, sections, numbered = false, draft = false }: {
  title: string;
  accent: string;
  intro: string;
  path: string;
  highlights: LegalHighlight[];
  sections: LegalSection[];
  numbered?: boolean;
  draft?: boolean;
}) {
  return (
    <>
      <header className="bg-gradient-to-br from-ink to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Breadcrumbs items={[{ label: [title, accent].filter(Boolean).join(" ") }]} />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Legal</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{title ? `${title} ` : ""}<span className="text-amber-300">{accent}</span></h1>
          <p className="mt-3 max-w-2xl text-white/85 sm:text-lg">{intro}</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        {draft && (
          <p role="note" className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <FileWarning size={20} className="mt-0.5 shrink-0" aria-hidden />
            <span><strong>Draft text.</strong> This page is to be reviewed by legal counsel and finalised before launch.</span>
          </p>
        )}

        <ul className="mb-10 grid gap-4 md:grid-cols-3" aria-label="Key points">
          {highlights.map(({ icon: Icon, title: t, text }) => (
            <li key={t} className="flex gap-4 rounded-2xl bg-surface-alt p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-red shadow-sm"><Icon size={22} aria-hidden /></span>
              <span>
                <span className="block font-bold">{t}</span>
                <span className="mt-0.5 block text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
          <aside className="lg:order-first">
            <div className="space-y-5 lg:sticky lg:top-28">
              <nav aria-label="On this page" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-brand-red">On this page</h2>
                <ol className="mt-3 space-y-2 text-sm">
                  {sections.map((s, i) => (
                    <li key={s.id} className="flex gap-2">
                      {numbered && <span className="w-5 shrink-0 text-muted">{i + 1}.</span>}
                      <a href={`#${s.id}`} className="font-medium hover:text-brand-red">{s.title}</a>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="hidden space-y-5 lg:block">
                <section aria-labelledby="legal-contact" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                  <h2 id="legal-contact" className="text-sm font-extrabold uppercase tracking-wide text-brand-red">Questions?</h2>
                  <p className="mt-2 text-sm text-muted">Write to us and our team will help.</p>
                  <p className="mt-3 flex items-center gap-2 text-sm"><Mail size={15} className="text-brand-red" aria-hidden /><a href={`mailto:${site.email}`} className="font-medium hover:underline">{site.email}</a></p>
                  <p className="mt-2 flex items-center gap-2 text-sm"><Phone size={15} className="text-brand-red" aria-hidden /><a href={site.phoneHref} className="font-medium hover:underline">{site.phone}</a></p>
                </section>
                <nav aria-label="Other policies" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-brand-red">Other policies</h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {policies.filter((p) => p.href !== path).map((p) => <li key={p.href}><Link href={p.href} className="font-medium hover:text-brand-red">{p.label}</Link></li>)}
                  </ul>
                </nav>
              </div>
            </div>
          </aside>

          <article className="min-w-0 divide-y divide-black/10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28 py-8 first:pt-0 last:pb-0">
                <h2 id={`${s.id}-h`} className="flex items-center gap-3 text-xl font-extrabold sm:text-2xl">
                  {numbered && <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-red text-sm text-white" aria-hidden>{i + 1}</span>}
                  {s.title}
                </h2>
                <div className="mt-3 space-y-3 text-[15.5px] leading-relaxed text-ink/85 [&_a]:font-medium [&_a]:text-brand-red [&_a]:underline [&_li]:list-disc [&_li]:pl-1 [&_ul]:ml-5 [&_ul]:space-y-1.5">{s.body}</div>
              </section>
            ))}
          </article>
        </div>

        <section aria-labelledby="legal-help" className="mt-12 rounded-3xl bg-gradient-to-r from-brand-red-dark to-brand-red p-6 text-white sm:p-8 lg:hidden">
          <h2 id="legal-help" className="text-xl font-extrabold">Questions?</h2>
          <p className="mt-1 text-sm text-white/85">Write to us and our team will help.</p>
          <p className="mt-3 text-sm"><a href={`mailto:${site.email}`} className="font-semibold underline">{site.email}</a> · <a href={site.phoneHref} className="font-semibold underline">{site.phone}</a></p>
        </section>
      </div>
    </>
  );
}
