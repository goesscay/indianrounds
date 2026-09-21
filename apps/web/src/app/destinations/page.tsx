import type { Metadata } from "next";
import { getDestinations } from "@/lib/api";
import { DestinationCard } from "@/components/DestinationCard";
import { SectionHeading } from "@/components/SectionHeading";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Destinations",
  description: "Explore India and international destinations with curated Indian Rounds tours.",
  alternates: { canonical: "/destinations" },
};

export default async function DestinationsPage() {
  const destinations = await getDestinations();
  const groups = [
    { key: "india", title: "India", items: destinations.filter((d) => d.region === "india") },
    { key: "international", title: "International", items: destinations.filter((d) => d.region === "international") },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          Our <span className="text-brand-red">Destinations</span>
        </h1>
        <p className="mt-2 text-muted">Handpicked places for your next getaway.</p>
      </header>
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.key}>
              <SectionHeading lead={g.title} accent="Trips" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {g.items.map((d) => (
                  <DestinationCard key={d.slug} destination={d} />
                ))}
              </div>
            </section>
          ),
      )}
      {destinations.length === 0 && <p className="text-muted">No destinations are available right now.</p>}
    </div>
  );
}
