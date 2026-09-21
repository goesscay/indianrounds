"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The public header/footer/WhatsApp button are hidden inside the staff back office. */
export function SiteChrome({ header, footer, floating, children }: { header: ReactNode; footer: ReactNode; floating: ReactNode; children: ReactNode }) {
  const inAdmin = usePathname().startsWith("/admin");

  if (inAdmin) return <div className="flex-1">{children}</div>;

  return (
    <>
      {header}
      <div className="flex-1">{children}</div>
      {footer}
      {floating}
    </>
  );
}
