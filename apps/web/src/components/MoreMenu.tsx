"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FocusEvent } from "react";
import { ChevronDown } from "lucide-react";
import { moreLinks } from "@/lib/site";

export function MoreMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // See DestinationsMegaMenu: closes on every route change since the cursor doesn't move
  // during a client-side navigation, which would otherwise leave a plain CSS :hover panel open.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  function closeOnBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={closeOnBlur}>
      <button type="button" aria-haspopup="true" aria-expanded={open} className="flex items-center gap-1 text-sm font-semibold text-white/90 transition hover:text-white">
        More <ChevronDown size={14} />
      </button>
      <ul className={`absolute right-0 top-full z-50 w-56 rounded-xl border border-black/5 bg-white py-2 shadow-float transition ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
        {moreLinks.map((l) => (
          <li key={l.href}>
            <Link href={l.href} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt hover:text-brand-red">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
