import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, Clock, Compass, FileText, Globe2, HeartHandshake, Mail, MapPin, MessageSquareText, ScanSearch, Sparkles, UserCheck, UserPlus } from "lucide-react";
import { getJobOpenings } from "@/lib/api";
import { site } from "@/lib/site";
import { ApplyForm } from "@/components/ApplyForm";
import { CoverImage } from "@/components/CoverImage";
import { Reveal } from "@/components/home/Reveal";
import { Breadcrumbs } from "@/components/MenuViews";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join Indian Rounds and help people travel further. See open roles in operations, sales and more, and apply online.",
  alternates: { canonical: "/careers" },
};

type Props = { searchParams: Promise<{ role?: string }> };

const reasons = [
  { icon: Compass, title: "Help people travel further", text: "Your work turns a dream destination into a trip someone remembers for life." },
  { icon: Globe2, title: "India and the world", text: "Work on domestic holidays, weekend escapes and international journeys, all in one team." },
  { icon: Sparkles, title: "Learn how travel works", text: "See the whole journey, from planning and quotes to on-trip support and feedback." },
  { icon: HeartHandshake, title: "Honest, helpful service", text: "We believe in clear information and genuine care for the traveller. You will be part of that." },
];

const traits = ["Curious about places and people", "Calm under pressure", "A clear communicator", "Careful with details", "Happy to help, and happy to learn"];

const steps = [
  { icon: UserPlus, title: "Apply online", text: "Send the form below with your experience and, if you like, your resume." },
  { icon: ScanSearch, title: "We review", text: "Our team reads every application and compares it with our open roles." },
  { icon: MessageSquareText, title: "Let's talk", text: "Shortlisted candidates are contacted for a conversation about the role." },
  { icon: UserCheck, title: "Welcome aboard", text: "If it is a fit on both sides, we agree the details and get you started." },
];

const faqs = [
  { q: "What if there is no role that matches me?", a: "Send a general application using the form below and choose general application. We keep it on file and contact you when a suitable role opens." },
  { q: "What should I include in my application?", a: "Tell us about your experience and what draws you to travel. You can add a resume (PDF, DOC or DOCX, up to 5 MB) and a link to your professional profile." },
  { q: "Will I hear back?", a: "Our team reviews every application. Candidates who are shortlisted are contacted by phone or email." },
  { q: "Who can I ask about a role?", a: `Write to us at ${site.email} and we will point you to the right person.` },
];

export default async function CareersPage({ searchParams }: Props) {
  const { role } = await searchParams;
  const openings = await getJobOpenings();
  const chosen = openings.find((o) => String(o.id) === role)?.id;
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10">
          <CoverImage src="/photos/places/himachal-pradesh/dhauladhar-range-dharamshala.jpg" alt="" seed="careers" className="h-full w-full" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/60 to-black/20" aria-hidden />
        <div className="mx-auto flex min-h-[22rem] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:min-h-[28rem] lg:px-8">
          <Breadcrumbs items={[{ label: "Careers" }]} />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Work with us</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">Careers at <span className="text-amber-300">Indian Rounds</span></h1>
          <p className="mt-3 max-w-xl text-white/90 sm:text-lg">Help people travel further. We hire curious, calm-under-pressure people who love a good itinerary.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#roles" className="rounded-full bg-brand-red px-7 py-3 font-semibold text-white shadow-lg hover:bg-brand-red-dark">See open roles</a>
            <a href="#apply" className="rounded-full border border-white/70 px-7 py-3 font-semibold hover:bg-white hover:text-ink">Apply now</a>
            {openings.length > 0 && <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur">{openings.length} open {openings.length === 1 ? "role" : "roles"}</span>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <Reveal>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Why work <span className="text-brand-red">with us</span></h2>
          <p className="mt-1 text-sm text-muted">A growing travel company where the work is about people and places.</p>
        </Reveal>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={i * 80} className="h-full">
                <div className="h-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-float">
                  <span className="grid size-12 place-items-center rounded-xl bg-brand-red/10 text-brand-red"><Icon size={24} aria-hidden /></span>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section id="roles" className="scroll-mt-32 bg-surface-alt">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-16">
          <Reveal>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Open <span className="text-brand-red">positions</span></h2>
            <p className="mt-1 text-sm text-muted">{openings.length > 0 ? "Choose a role to apply for it directly." : "We are not hiring for a specific role right now."}</p>
          </Reveal>

          {openings.length === 0 ? (
            <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
              <Briefcase className="mx-auto text-brand-red" size={36} aria-hidden />
              <h3 className="mt-3 text-xl font-bold">No openings right now</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">Send us a general application and we will keep it on file and get in touch when a suitable role opens.</p>
              <a href="#apply" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3 font-semibold text-white hover:bg-brand-red-dark">Send a general application <ArrowRight size={16} aria-hidden /></a>
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {openings.map((o, i) => (
                <li key={o.id}>
                  <Reveal delay={i * 70}>
                    <article className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:shadow-float sm:flex-row sm:items-start sm:justify-between sm:p-7">
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold">{o.title}</h3>
                        <ul className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                          {o.department && <li className="rounded-full bg-brand-red/10 px-3 py-1 uppercase tracking-wide text-brand-red">{o.department}</li>}
                          {o.location && <li className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1"><MapPin size={12} aria-hidden />{o.location}</li>}
                          {o.employment_type && <li className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1"><Clock size={12} aria-hidden />{o.employment_type}</li>}
                        </ul>
                        <p className="mt-3 text-sm leading-relaxed text-ink/85">{o.description}</p>
                      </div>
                      <Link href={`/careers?role=${o.id}#apply`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark">Apply for this role <ArrowRight size={15} aria-hidden /></Link>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[2fr_3fr]">
          <Reveal>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Who we <span className="text-brand-red">look for</span></h2>
            <ul className="mt-5 space-y-2.5">
              {traits.map((t) => (
                <li key={t} className="flex items-center gap-3 font-medium"><span className="grid size-6 place-items-center rounded-full bg-brand-red text-xs text-white" aria-hidden>✓</span>{t}</li>
              ))}
            </ul>
          </Reveal>
          <div>
            <Reveal><h2 className="text-3xl font-extrabold sm:text-4xl">How hiring <span className="text-brand-red">works</span></h2></Reveal>
            <ol className="mt-5 grid gap-4 sm:grid-cols-2">
              {steps.map(({ icon: Icon, title, text }, i) => (
                <li key={title}>
                  <Reveal delay={i * 80} className="h-full">
                    <div className="relative h-full rounded-2xl border border-black/10 bg-white p-5">
                      <span className="absolute right-4 top-2 text-4xl font-extrabold text-brand-red/10" aria-hidden>{i + 1}</span>
                      <span className="grid size-10 place-items-center rounded-lg bg-brand-red/10 text-brand-red"><Icon size={20} aria-hidden /></span>
                      <h3 className="mt-3 font-bold">{title}</h3>
                      <p className="mt-1 text-sm text-muted">{text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="apply" className="scroll-mt-32 bg-gradient-to-br from-ink to-slate-800 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[2fr_3fr] lg:gap-14 lg:px-8 lg:py-16">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Apply <span className="text-amber-300">now</span></h2>
            <p className="mt-3 text-white/85">Tell us a little about yourself. It takes a few minutes, and a resume is optional.</p>
            <ul className="mt-6 space-y-3 text-sm text-white/90">
              <li className="flex gap-3"><FileText size={18} className="mt-0.5 shrink-0 text-amber-300" aria-hidden /> Resume as PDF, DOC or DOCX, up to 5 MB</li>
              <li className="flex gap-3"><Briefcase size={18} className="mt-0.5 shrink-0 text-amber-300" aria-hidden /> Choose a role, or send a general application</li>
              <li className="flex gap-3"><Mail size={18} className="mt-0.5 shrink-0 text-amber-300" aria-hidden /> Questions? Write to <a href={`mailto:${site.email}`} className="font-semibold underline">{site.email}</a></li>
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-6 text-ink shadow-float sm:p-8">
            <ApplyForm key={chosen ?? "general"} openings={openings} defaultOpening={chosen} />
          </div>
        </div>
      </section>

      <section className="bg-surface-alt">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-16">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Hiring <span className="text-brand-red">FAQs</span></h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f, i) => (
              <details key={f.q} open={i === 0} className="group rounded-card border border-black/10 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-bold marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-brand-red transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="border-t border-black/10 px-5 py-4 text-sm leading-relaxed text-ink/85">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
