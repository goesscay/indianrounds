import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import type { Destination } from "@/lib/api";

const label = "block text-[11px] text-muted";
const control = "w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted";

/** Plain GET form so search works without JS and results are shareable URLs. */
export function TourSearchBar({ destinations }: { destinations: Destination[] }) {
  return (
    <form action="/tours" method="get" className="grid gap-2 rounded-2xl bg-white p-3 shadow-float sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center lg:gap-0">
      <div className="flex items-center gap-3 px-3 py-2 lg:border-r lg:border-black/10">
        <MapPin className="shrink-0 text-brand-red" size={22} />
        <div className="w-full">
          <label htmlFor="sb-dest" className="text-sm font-semibold">Destination</label>
          <select id="sb-dest" name="destination" className={control} defaultValue="">
            <option value="">Where do you want to go?</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 px-3 py-2 lg:border-r lg:border-black/10">
        <CalendarDays className="shrink-0 text-brand-red" size={22} />
        <div className="w-full">
          <label htmlFor="sb-month" className="text-sm font-semibold">Travel Date</label>
          <input id="sb-month" name="month" type="month" className={control} />
          <span className={label}>Pick a month</span>
        </div>
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <Users className="shrink-0 text-brand-red" size={22} />
        <div className="w-full">
          <label htmlFor="sb-trav" className="text-sm font-semibold">Travellers</label>
          <input id="sb-trav" name="travellers" type="number" min={1} max={50} placeholder="1 Traveller" className={control} />
        </div>
      </div>
      <button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-brand-red px-8 py-4 font-semibold text-white transition hover:bg-brand-red-dark sm:col-span-2 lg:col-span-1">
        <Search size={20} /> Search Tours
      </button>
    </form>
  );
}
