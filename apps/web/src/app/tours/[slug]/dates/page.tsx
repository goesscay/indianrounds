import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTour } from "@/lib/api";
import { DatesPicker } from "@/components/DatesPicker";

export const revalidate = 30;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTour(slug);
  return { title: t ? `Dates & Costing — ${t.title}` : "Dates & Costing", robots: { index: false } };
}

export default async function DatesPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTour(slug);
  if (!t) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href={`/tours/${t.slug}`} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-red">
        <ArrowLeft size={16} /> Back to tour
      </Link>
      <h1 className="text-3xl font-extrabold sm:text-4xl">Dates &amp; Costing</h1>
      <p className="mt-1 inline-block rounded-full bg-brand-red px-4 py-1 text-sm font-semibold text-white">{t.title}</p>
      <div className="mt-8">
        <DatesPicker tourTitle={t.title} destination={t.destination?.name} batches={t.batches ?? []} variants={t.variants ?? []} basePrice={t.price} />
      </div>
    </div>
  );
}
