import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getMenuCountries } from "@/lib/api";
import { isMenu, MENUS } from "@/lib/menus";
import { MenuCountriesView } from "@/components/MenuViews";

export const revalidate = 60;

type Props = { params: Promise<{ menu: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { menu } = await params;
  if (!isMenu(menu)) return { title: "Not found" };
  return { title: MENUS[menu].title, description: MENUS[menu].description, alternates: { canonical: `/${menu}` } };
}

export default async function MenuPage({ params }: Props) {
  const { menu } = await params;
  if (!isMenu(menu)) notFound();

  const countries = await getMenuCountries(menu);
  // No categories set up for this menu yet: fall back to the classic listing rather than an empty page.
  if (countries.length === 0) redirect(MENUS[menu].legacy);

  return <MenuCountriesView menu={menu} title={MENUS[menu].title} intro={MENUS[menu].intro} countries={countries} />;
}
