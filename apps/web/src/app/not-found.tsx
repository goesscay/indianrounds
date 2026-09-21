import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-script text-4xl text-brand-red">Lost your way?</p>
      <h1 className="mt-2 text-5xl font-extrabold">404</h1>
      <p className="mt-3 text-muted">We couldn&apos;t find that page. Let&apos;s get you back on track.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-full bg-brand-red px-6 py-3 font-semibold text-white hover:bg-brand-red-dark">Home</Link>
        <Link href="/tours" className="rounded-full border border-brand-red px-6 py-3 font-semibold text-brand-red">Browse tours</Link>
      </div>
    </div>
  );
}
