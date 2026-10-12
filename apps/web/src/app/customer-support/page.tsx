import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, FileWarning, Headset, Mail, Phone, Ticket } from "lucide-react";
import { site } from "@/lib/site";
import { Breadcrumbs } from "@/components/MenuViews";

export const metadata: Metadata = {
  title: "Customer Support & Grievance Redressal",
  description: "How to reach Indian Rounds if something goes wrong with your trip or booking, what to include, and how a complaint is escalated.",
  alternates: { canonical: "/customer-support" },
};

const include = [
  "Your booking reference",
  "The name of the traveller and the trip",
  "What happened and when",
  "What you would like us to do",
  "Photos, receipts or messages that help explain the issue",
];

const stages = [
  { title: "Support team", text: "Acknowledgement and first response.", todo: "Officer name, contact and response time to be confirmed." },
  { title: "Escalation officer", text: "Reviews cases that are still unresolved.", todo: "Details to be confirmed." },
  { title: "Head of grievance redressal", text: "Final review of the case.", todo: "Details to be confirmed." },
];

export default function CustomerSupportPage() {
  const channels = [
    { icon: Mail, label: "Email", value: site.email, note: "Include your booking reference", href: `mailto:${site.email}` },
    { icon: Phone, label: "Call", value: site.phone, note: site.hours, href: site.phoneHref },
    { icon: Ticket, label: "Support ticket", value: "Raise and track in your account", note: "Sign in to see updates", href: "/account/support", internal: true },
  ];

  return (
    <>
      <header className="bg-gradient-to-br from-ink to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Breadcrumbs items={[{ label: "Customer Support" }]} />
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-300"><Headset size={15} aria-hidden /> We are here to help</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Customer <span className="text-amber-300">Support</span></h1>
          <p className="mt-3 max-w-2xl text-white/85 sm:text-lg">If something goes wrong with your trip or booking, here is how to reach us and how we escalate.</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <p role="note" className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <FileWarning size={20} className="mt-0.5 shrink-0" aria-hidden />
          <span><strong>Draft text.</strong> Named officers, response timelines and statutory references will be published here once provided by Indian Rounds.</span>
        </p>

        <section aria-labelledby="raise-h">
          <h2 id="raise-h" className="text-2xl font-extrabold sm:text-3xl">How to raise a <span className="text-brand-red">complaint</span></h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {channels.map(({ icon: Icon, label, value, note, href, internal }) => (
              <li key={label}>
                {internal ? (
                  <Link href={href} className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-float ring-1 ring-black/5 transition hover:-translate-y-1">
                    <Card Icon={Icon} label={label} value={value} note={note} />
                  </Link>
                ) : (
                  <a href={href} className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-float ring-1 ring-black/5 transition hover:-translate-y-1">
                    <Card Icon={Icon} label={label} value={value} note={note} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-14">
          <section aria-labelledby="include-h" className="rounded-3xl bg-surface-alt p-6 sm:p-8">
            <h2 id="include-h" className="flex items-center gap-2 text-xl font-extrabold"><ClipboardList size={20} className="text-brand-red" aria-hidden /> What to include</h2>
            <p className="mt-1 text-sm text-muted">The more we know, the faster we can help.</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {include.map((i) => (
                <li key={i} className="flex gap-3"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-red text-[11px] text-white" aria-hidden>✓</span>{i}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="stages-h">
            <h2 id="stages-h" className="text-2xl font-extrabold sm:text-3xl">Escalation <span className="text-brand-red">stages</span></h2>
            <p className="mt-1 text-sm text-muted">If your issue is not resolved at one stage, it moves to the next.</p>
            <ol className="mt-5 space-y-4">
              {stages.map((s, i) => (
                <li key={s.title} className="relative flex gap-4 rounded-2xl border border-black/10 bg-white p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-red text-lg font-extrabold text-white" aria-hidden>{i + 1}</span>
                  <div>
                    <h3 className="font-bold">Stage {i + 1}: {s.title}</h3>
                    <p className="mt-0.5 text-sm text-ink/85">{s.text}</p>
                    <p className="mt-1.5 text-xs font-semibold text-amber-800">{s.todo}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section aria-labelledby="more-h" className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-brand-red-dark to-brand-red p-6 text-white sm:p-8">
          <div>
            <h2 id="more-h" className="text-xl font-extrabold">Not a complaint? Just a question?</h2>
            <p className="mt-1 text-sm text-white/85">Our team can help with trips, dates and bookings.</p>
          </div>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 font-semibold text-brand-red hover:bg-white/90">Contact us <ArrowRight size={16} aria-hidden /></Link>
        </section>
      </div>
    </>
  );
}

function Card({ Icon, label, value, note }: { Icon: typeof Mail; label: string; value: string; note: string }) {
  return (
    <>
      <span className="grid size-12 place-items-center rounded-xl bg-brand-red/10 text-brand-red transition group-hover:bg-brand-red group-hover:text-white"><Icon size={22} aria-hidden /></span>
      <span className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="mt-0.5 break-words font-bold">{value}</span>
      <span className="mt-1 text-sm text-muted">{note}</span>
    </>
  );
}
