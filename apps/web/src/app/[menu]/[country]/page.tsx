import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenuCountry } from "@/lib/api";
import { isMenu, MENUS } from "@/lib/menus";
import { MenuCountryView } from "@/components/MenuViews";

export const revalidate = 60;

type Props = { params: Promise<{ menu: string; country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { menu, country } = await params;
  if (!isMenu(menu)) return { title: "Not found" };
  const data = await getMenuCountry(menu, country);
  if (!data) return { title: "Not found" };
  return {
    title: `${data.destination.name} ${MENUS[menu].title}`,
    description: data.destination.about ?? `${MENUS[menu].title} in ${data.destination.name} with Indian Rounds.`,
    alternates: { canonical: `/${menu}/${country}` },
  };
}

export default async function MenuCountryPage({ params }: Props) {
  const { menu, country } = await params;
  if (!isMenu(menu)) notFound();
  const data = await getMenuCountry(menu, country);
  if (!data) notFound();

  return <MenuCountryView menu={menu} destination={data.destination} categories={data.data} />;
}
