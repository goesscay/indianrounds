"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Picked up by the hosting platform's log drain / error tracker.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center" role="alert">
      <h1 className="text-4xl font-extrabold">Something went wrong</h1>
      <p className="mt-3 text-muted">We hit a problem loading this page. Please try again — if it keeps happening, call us.</p>
      {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark">Try again</button>
        <Link href="/" className="rounded-full border border-brand-red px-6 py-3 font-semibold text-brand-red">Home</Link>
      </div>
    </div>
  );
}
