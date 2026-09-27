import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenuCategory } from "@/lib/api";
import { isMenu, MENUS } from "@/lib/menus";
import { MenuCategoryView } from "@/components/MenuViews";

export const revalidate = 60;

type Props = { params: Promise<{ menu: string; country: string; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { menu, country, category } = await params;
  if (!isMenu(menu)) return { title: "Not found" };
  const data = await getMenuCategory(menu, country, category);
  if (!data) return { title: "Not found" };
  return {
    title: `${data.destination.name} ${data.category.name} (${MENUS[menu].title})`,
    description: data.category.description ?? `${data.category.name} packages in ${data.destination.name}.`,
    alternates: { canonical: `/${menu}/${country}/${category}` },
  };
}

export default async function MenuCategoryPage({ params }: Props) {
  const { menu, country, category } = await params;
  if (!isMenu(menu)) notFound();
  const data = await getMenuCategory(menu, country, category);
  if (!data) notFound();

  return <MenuCategoryView menu={menu} destination={data.destination} category={data.category} tours={data.data} />;
}
