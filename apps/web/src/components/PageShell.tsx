import type { ReactNode } from "react";

export function PageShell({ title, accent, intro, children, draft }: { title: string; accent?: string; intro?: string; children: ReactNode; draft?: boolean }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          {title} {accent && <span className="text-brand-red">{accent}</span>}
        </h1>
        {intro && <p className="mt-3 text-muted">{intro}</p>}
        {draft && (
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Draft text — to be reviewed by legal counsel and finalised before launch.
          </p>
        )}
      </header>
      <div className="space-y-6 text-[15px] leading-relaxed text-ink/85 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </div>
  );
}
