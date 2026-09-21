import type { Metadata } from "next";

export const metadata: Metadata = { title: "Style guide", robots: { index: false } };

const colors = [
  ["brand-red", "bg-brand-red"],
  ["brand-red-dark", "bg-brand-red-dark"],
  ["ink", "bg-ink"],
  ["surface-alt", "bg-surface-alt border border-black/10"],
  ["footer", "bg-footer"],
  ["muted", "bg-muted"],
];

export default function StyleGuide() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-12 p-8">
      <h1 className="text-4xl font-extrabold">
        Style <span className="text-brand-red">guide</span>
      </h1>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Colours</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {colors.map(([name, cls]) => (
            <div key={name} className="space-y-2">
              <div className={`h-20 rounded-card ${cls}`} />
              <p className="text-sm font-medium">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Typography</h2>
        <p className="text-5xl font-extrabold leading-tight">
          Journeys That Stay <span className="text-brand-red">Forever</span>
        </p>
        <p className="font-script text-4xl text-brand-red">Travel Beyond Borders</p>
        <p className="text-muted">Discover handpicked destinations, seamless booking and unforgettable travel experiences.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Buttons & cards</h2>
        <div className="flex flex-wrap items-center gap-4">
          <button className="rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark">
            Explore Destinations
          </button>
          <button className="rounded-full border border-brand-red px-5 py-2 text-sm font-semibold text-brand-red">
            View All
          </button>
        </div>
        <div className="max-w-xs rounded-card bg-surface p-4 shadow-float">
          <p className="font-semibold">Kashmir Delight</p>
          <p className="text-sm text-muted">5 Days 4 Nights</p>
          <p className="mt-2 text-xl font-bold text-brand-red">₹24,999</p>
        </div>
      </section>
    </main>
  );
}
