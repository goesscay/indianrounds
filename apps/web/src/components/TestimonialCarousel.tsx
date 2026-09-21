"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { Testimonial } from "@/lib/api";

export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  if (items.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <button onClick={() => scroll(-1)} aria-label="Previous" className="grid size-10 place-items-center rounded-full border border-brand-red text-brand-red hover:bg-brand-red hover:text-white">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => scroll(1)} aria-label="Next" className="grid size-10 place-items-center rounded-full border border-brand-red text-brand-red hover:bg-brand-red hover:text-white">
          <ChevronRight size={18} />
        </button>
      </div>
      <ul ref={track} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none]">
        {items.map((t) => (
          <li key={t.id} className="w-[85%] shrink-0 snap-start rounded-card bg-white p-5 shadow-float sm:w-80">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-brand-red/10 font-bold text-brand-red">{t.name[0]}</span>
              <div>
                <p className="font-semibold leading-tight">{t.name}</p>
                <p className="flex gap-0.5 text-amber-500" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted">“{t.quote}”</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
