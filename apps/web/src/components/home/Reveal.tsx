"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades its children in as they scroll into view. Content is fully visible on first paint (and without JavaScript);
 * only blocks that start below the fold are hidden briefly, then revealed once.
 */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"visible" | "hidden" | "shown">("visible");

  useEffect(() => {
    const el = ref.current;
    // Anything that is already on screen, scrolled past, or cannot be observed simply stays visible.
    const rect = el?.getBoundingClientRect();
    if (!el || !rect || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches || rect.top < window.innerHeight * 0.9) {
      setState("visible");
      return;
    }
    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: state === "shown" ? `${delay}ms` : undefined }}
      className={`transition duration-700 ease-out ${state === "hidden" ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100"} ${className}`}
    >
      {children}
    </div>
  );
}
