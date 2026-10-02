import type { MenuSlug } from "./api";

type MenuMeta = { title: string; intro: string; description: string; legacy: string };

/** Menus with their own top-level URL. (Destinations keeps its existing /destinations pages.) */
export const MENUS: Record<Exclude<MenuSlug, "destinations">, MenuMeta> = {
  "group-tours": {
    title: "Group Tours",
    intro: "Fixed-date journeys with a guide, a small group and everything arranged.",
    description: "Guided group tours on fixed departure dates, with stays, transfers and sightseeing included.",
    // Shown until the catalogue has categories for this menu, so the header link never dead-ends.
    legacy: "/tours?type=group",
  },
  "weekend-escapes": {
    title: "Weekend Escapes",
    intro: "Short breaks planned so you can leave on Friday and be back for Monday.",
    description: "Short weekend getaways of one to three nights, planned around a Friday departure.",
    legacy: "/collections/weekend-getaways",
  },
  "christmas-new-year": {
    title: "Christmas & New Year",
    intro: "Ring in the season somewhere special. Book early, these departures fill first.",
    description: "Christmas and New Year holiday packages with festive stays and special experiences.",
    legacy: "/collections/christmas-new-year",
  },
  honeymoon: {
    title: "Honeymoon",
    intro: "Romantic stays and moments for two, planned from the first day to the last.",
    description: "Honeymoon and couples packages with romantic stays, private transfers and special experiences.",
    legacy: "/collections/couples-honeymoon",
  },
};

export function isMenu(v: string): v is Exclude<MenuSlug, "destinations"> {
  return Object.hasOwn(MENUS, v);
}
