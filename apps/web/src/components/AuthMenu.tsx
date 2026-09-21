"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

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

  if (loading) return <span className="hidden h-9 w-20 sm:block" aria-hidden />;

  if (!user) {
    return (
      <div className="hidden items-center gap-2 sm:flex">
        <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold hover:text-brand-red">Login</Link>
        <Link href="/register" className="rounded-full border border-brand-red px-4 py-2 text-sm font-semibold text-brand-red hover:bg-brand-red hover:text-white">Sign up</Link>
      </div>
    );
  }

  return (
    <div ref={box} className="relative hidden sm:block">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-2 text-sm font-semibold hover:border-brand-red">
        <UserIcon size={16} className="text-brand-red" />
        <span className="max-w-24 truncate">{user.name.split(" ")[0]}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-card border border-black/10 bg-white shadow-float">
          <Link href="/account" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm hover:bg-surface-alt">My account</Link>
          <Link href="/bookings" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm hover:bg-surface-alt">My bookings</Link>
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
              router.push("/");
              router.refresh();
            }}
            className="block w-full px-4 py-3 text-left text-sm hover:bg-surface-alt"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
