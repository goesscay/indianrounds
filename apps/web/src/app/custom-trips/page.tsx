import type { Metadata } from "next";
import { Compass, MessageSquareText, Wallet } from "lucide-react";
import { EnquiryForm } from "@/components/EnquiryForm";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Custom Trips",
  description: "Tell us where, when and how you like to travel — our team designs a personalised itinerary for you.",
  alternates: { canonical: "/custom-trips" },
};

const steps = [
  { icon: MessageSquareText, title: "Tell us your idea", text: "Share who is travelling, where you'd like to go and roughly when." },
  { icon: Compass, title: "We design it", text: "A travel designer builds an itinerary around your pace and interests." },
  { icon: Wallet, title: "Refine and book", text: "Adjust anything you like, then confirm with a secure online payment." },
];

export default function CustomTripsPage() {
  return (
    <>
      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Personalised experiences</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">A trip built just for you</h1>
          <p className="mt-2 max-w-2xl text-white/85">Can&apos;t find the right departure? Family holidays, honeymoons, friends&apos; trips — we&apos;ll design it from scratch.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-card bg-white p-6 shadow-float">
              <span className="grid size-12 place-items-center rounded-full bg-brand-red/10 text-brand-red"><Icon size={24} /></span>
              <h2 className="mt-4 font-bold">{i + 1}. {title}</h2>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <SectionHeading lead="Design" accent="My Trip" sub="A few details help us get the first draft right." />
        <div className="rounded-card bg-white p-6 shadow-float sm:p-8">
          <EnquiryForm kind="custom" />
        </div>
      </section>
    </>
  );
}
