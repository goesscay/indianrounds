"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** A horizontally scrolling row with snap points and previous / next buttons (touch users just swipe). */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });

  const btn = "grid size-10 place-items-center rounded-full border border-black/15 bg-white text-ink shadow transition hover:border-brand-red hover:text-brand-red";
  return (
    <div className="relative min-w-0">
      <ul ref={ref} aria-label={label} className="no-scrollbar -mx-4 flex scroll-px-4 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 sm:mx-0 sm:scroll-px-0 sm:px-0">
        {children}
      </ul>
      <div className="mt-2 hidden justify-end gap-2 md:flex">
        <button type="button" onClick={() => go(-1)} aria-label={`${label}: previous`} className={btn}><ChevronLeft size={20} /></button>
        <button type="button" onClick={() => go(1)} aria-label={`${label}: next`} className={btn}><ChevronRight size={20} /></button>
      </div>
    </div>
  );
}
