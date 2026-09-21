"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { LeadForm } from "./LeadForm";

type OpenOptions = { source?: "quote" | "callback"; destination?: string; message?: string; title?: string };

const LeadModalContext = createContext<{ open: (o?: OpenOptions) => void }>({ open: () => {} });

export const useLeadModal = () => useContext(LeadModalContext);

export function LeadModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpenOptions | null>(null);
  const open = useCallback((o: OpenOptions = {}) => setState(o), []);
  const close = useCallback(() => setState(null), []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [state, close]);

  return (
    <LeadModalContext.Provider value={{ open }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-modal-title"
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-float sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={close} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1 text-muted hover:bg-surface-alt">
              <X size={20} />
            </button>
            <h2 id="lead-modal-title" className="pr-8 text-2xl font-extrabold">
              {state.title ?? "Get a Free Quote"}
            </h2>
            <p className="mb-4 mt-1 text-sm text-muted">Tell us about your trip and our travel expert will call you back.</p>
            <LeadForm source={state.source ?? "quote"} defaultDestination={state.destination} defaultMessage={state.message} onDone={close} />
          </div>
        </div>
      )}
    </LeadModalContext.Provider>
  );
}

export function OpenQuoteButton({ children, className, options }: { children: ReactNode; className?: string; options?: OpenOptions }) {
  const { open } = useLeadModal();
  return (
    <button type="button" className={className} onClick={() => open(options)}>
      {children}
    </button>
  );
}
