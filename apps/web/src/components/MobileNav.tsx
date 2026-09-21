"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { moreLinks, navLinks, site } from "@/lib/site";
import { useAuth } from "@/lib/auth";
import { useLeadModal } from "./LeadModal";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { open: openQuote } = useLeadModal();
  const { user, logout } = useAuth();

  return (
    <div className="lg:hidden">
      <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-full p-2 hover:bg-surface-alt">
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-black/10 bg-white shadow-float">
          <nav aria-label="Mobile" className="mx-auto flex max-w-7xl flex-col p-4">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-black/5 py-3 font-semibold">
                {l.label}
              </Link>
            ))}
            {moreLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-black/5 py-3 pl-4 text-sm font-medium text-ink/80">
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                {user.staff && <Link href="/admin" onClick={() => setOpen(false)} className="border-b border-black/5 py-3 font-semibold text-brand-red">Admin</Link>}
                <Link href="/account" onClick={() => setOpen(false)} className="border-b border-black/5 py-3 font-semibold">My account</Link>
                <Link href="/bookings" onClick={() => setOpen(false)} className="border-b border-black/5 py-3 font-semibold">My bookings</Link>
                <button onClick={async () => { setOpen(false); await logout(); }} className="border-b border-black/5 py-3 text-left font-semibold">Log out ({user.name.split(" ")[0]})</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="border-b border-black/5 py-3 font-semibold">Login</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="border-b border-black/5 py-3 font-semibold">Sign up</Link>
              </>
            )}
            <a href={site.phoneHref} className="py-3 font-semibold text-brand-red">
              Call {site.phone}
            </a>
            <button
              onClick={() => {
                setOpen(false);
                openQuote();
              }}
              className="mt-2 rounded-full bg-brand-red px-5 py-3 font-semibold text-white"
            >
              Plan Your Trip
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
