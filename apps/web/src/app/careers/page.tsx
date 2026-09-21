import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { getJobOpenings } from "@/lib/api";
import { ApplyForm } from "@/components/ApplyForm";
import { SectionHeading } from "@/components/SectionHeading";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Careers",
  description: "Join Indian Rounds — open roles in operations, sales and more.",
  alternates: { canonical: "/careers" },
};

export default async function CareersPage() {
  const openings = await getJobOpenings();

  return (
    <>
      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Work with us</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Careers at Indian Rounds</h1>
          <p className="mt-2 max-w-2xl text-white/85">Help people travel further. We hire curious, calm-under-pressure people who love a good itinerary.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <SectionHeading lead="Open" accent="Positions" />
        {openings.length === 0 ? (
          <p className="text-muted">No openings right now — send a general application below and we&apos;ll keep it on file.</p>
        ) : (
          <ul className="space-y-4">
            {openings.map((o) => (
              <li key={o.id} className="rounded-card bg-white p-6 shadow-float">
                <h3 className="text-lg font-bold">{o.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                  {o.department && <span className="font-semibold uppercase tracking-wide text-brand-red">{o.department}</span>}
                  {o.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{o.location}</span>}
                  {o.employment_type && <span>{o.employment_type}</span>}
                </p>
                <p className="mt-2 text-sm text-ink/85">{o.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="apply" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-16 sm:px-6">
        <SectionHeading lead="Apply" accent="Now" />
        <div className="rounded-card bg-white p-6 shadow-float sm:p-8">
          <ApplyForm openings={openings} />
        </div>
      </section>
    </>
  );
}
