import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenuCategory } from "@/lib/api";
import { MenuCategoryView } from "@/components/MenuViews";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, category } = await params;
  const data = await getMenuCategory("destinations", slug, category);
  if (!data) return { title: "Not found" };
  return {
    title: `${data.destination.name} ${data.category.name} Packages`,
    description: data.category.description ?? `${data.category.name} packages in ${data.destination.name}.`,
    alternates: { canonical: `/destinations/${slug}/${category}` },
  };
}

export default async function DestinationCategoryPage({ params }: Props) {
  const { slug, category } = await params;
  const data = await getMenuCategory("destinations", slug, category);
  if (!data) notFound();

  return <MenuCategoryView menu="destinations" destination={data.destination} category={data.category} tours={data.data} />;
}
