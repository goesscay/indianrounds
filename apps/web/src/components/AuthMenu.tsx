"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

/** Compact, icon-only account control for the header: no "Login"/"Sign up" text, just one small button. */
export function AuthMenu() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) return <span className="block size-9 shrink-0 rounded-full bg-surface-alt" aria-hidden />;

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={user ? `Account: ${user.name}` : "Account menu"}
        className="grid size-9 shrink-0 place-items-center rounded-full border border-black/10 text-ink/75 transition hover:border-brand-red hover:text-brand-red"
      >
        <UserIcon size={17} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-card border border-black/10 bg-white text-left shadow-float">
          {user ? (
            <>
              <p className="truncate border-b border-black/5 px-4 py-3 text-sm font-semibold">{user.name}</p>
              {user.staff && <Link href="/admin" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-semibold text-brand-red hover:bg-surface-alt">Admin</Link>}
              <Link href="/account" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm hover:bg-surface-alt">My account</Link>
              <Link href="/bookings" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm hover:bg-surface-alt">My bookings</Link>
              <button
                onClick={async () => {
                  setOpen(false);
                  await logout();
                  router.push("/");
                  router.refresh();
                }}
                className="flex w-full items-center gap-2 border-t border-black/5 px-4 py-3 text-left text-sm hover:bg-surface-alt"
              >
                <LogOut size={14} /> Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-semibold hover:bg-surface-alt">Login</Link>
              <Link href="/register" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-semibold text-brand-red hover:bg-surface-alt">Sign up</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
