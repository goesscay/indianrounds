"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The public header/footer/WhatsApp button are hidden inside the staff back office. */
export function SiteChrome({ header, footer, floating, children }: { header: ReactNode; footer: ReactNode; floating: ReactNode; children: ReactNode }) {
  const inAdmin = usePathname().startsWith("/admin");

  if (inAdmin) return <div className="flex-1">{children}</div>;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand-red focus:px-5 focus:py-2.5 focus:font-semibold focus:text-white">
        Skip to main content
      </a>
      {header}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      {footer}
      {floating}
    </>
  );
}
