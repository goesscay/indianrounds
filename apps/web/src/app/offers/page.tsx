import type { Metadata } from "next";
import { BadgePercent } from "lucide-react";
import { getTours } from "@/lib/api";
import { SectionHeading } from "@/components/SectionHeading";
import { TourCard } from "@/components/TourCard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Special Offers",
  description: "Limited-time savings on handpicked Indian Rounds tours and packages.",
  alternates: { canonical: "/offers" },
};

export default async function OffersPage() {
  const tours = await getTours({ per_page: "24", sort: "price_asc" });
  const offers = tours.data
        .filter((t): t is typeof t & { price: number; original_price: number } => t.price !== null && t.original_price !== null && t.original_price > t.price)
    .sort((a, b) => (b.original_price - b.price) / b.original_price - (a.original_price - a.price) / a.original_price);

  return (
    <>
      <section className="bg-gradient-to-r from-brand-red-dark to-brand-red text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/80"><BadgePercent size={16} /> Limited-time savings</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Special Offers</h1>
          <p className="mt-2 max-w-2xl text-white/85">Handpicked tours at a discount — booked up while seats and prices last.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading lead="Today's Best" accent="Deals" sub={`${offers.length} tour${offers.length === 1 ? "" : "s"} on offer right now`} href="/tours" cta="Browse all tours" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {offers.map((t) => <TourCard key={t.slug} tour={t} />)}
        </div>
        {offers.length === 0 && <p className="text-muted">No discounted tours right now — check back soon, or browse the full catalogue.</p>}
      </div>
    </>
  );
}
