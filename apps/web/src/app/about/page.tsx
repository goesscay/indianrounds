import type { Metadata } from "next";
import { Compass, Handshake, ShieldCheck, Sparkles } from "lucide-react";
import { OpenQuoteButton } from "@/components/LeadModal";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "About Us",
  description: "Indian Rounds designs curated group and custom journeys across India and the world.",
  alternates: { canonical: "/about" },
};

const values = [
  { icon: Sparkles, title: "Memorable experiences", text: "Every itinerary balances the famous sights with unhurried time to enjoy them." },
  { icon: ShieldCheck, title: "Safe & transparent", text: "Clear inclusions, honest pricing and support before, during and after your trip." },
  { icon: Compass, title: "Customised journeys", text: "Start from a fixed departure or ask our experts to shape a trip around you." },
  { icon: Handshake, title: "Trusted partners", text: "We work with vetted hotels, drivers and local guides in every destination." },
];

export default function AboutPage() {
  return (
    <PageShell title="About" accent="Indian Rounds" intro="Travel Beyond Borders — curated tours across India and the world.">
      <p>
        Indian Rounds is a travel company that plans and manages group departures and custom holidays. We take care of stays, transport, sightseeing and on-trip support so that you can focus on the journey.
      </p>
      <p>Our story, team and company details will be added here by the Indian Rounds team.</p>
      <ul className="!mt-8 grid list-none gap-4 sm:grid-cols-2 [&_li]:m-0 [&_li]:list-none">
        {values.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-card bg-surface-alt p-5">
            <Icon className="mb-2 text-brand-red" size={26} />
            <h2 className="!mt-0 text-lg">{title}</h2>
            <p className="text-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>
      <OpenQuoteButton className="rounded-full bg-brand-red px-7 py-3 font-semibold text-white hover:bg-brand-red-dark">Plan Your Trip</OpenQuoteButton>
    </PageShell>
  );
}
