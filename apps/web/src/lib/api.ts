const API_URL = process.env.API_URL ?? "http://localhost:8000/api/v1";

export type Destination = {
  id: number;
  name: string;
  slug: string;
  region: "india" | "international";
  tagline: string | null;
  starting_price: number | null;
  image_url: string | null;
  featured: boolean;
  tours_count?: number;
  best_time?: string | null;
  seo_content?: { overview?: string; best_time?: string };
  tours?: Tour[];
};

export type Variant = { id: number; label: string; price: number; original_price: number | null };

export type Batch = {
  id: number;
  starts_on: string;
  ends_on: string;
  seats_left: number;
  status: "open" | "sold_out";
};

export type Tour = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  tour_type: "group" | "custom";
  haul_class: "short" | "long";
  duration_nights: number;
  duration_days: number;
  price: number;
  original_price: number | null;
  image_url: string | null;
  featured: boolean;
  destination?: { name: string; slug: string; region: string };
  next_batch?: { starts_on: string; seats_left: number } | null;
  // detail only
  pickup?: string | null;
  drop_point?: string | null;
  overview?: string | null;
  highlights?: string[];
  itinerary?: { day: number; title: string; description: string }[];
  inclusions?: string[];
  exclusions?: string[];
  notes?: string[];
  must_carry?: string[];
  gallery?: string[];
  variants?: Variant[];
  batches?: Batch[];
};

export type Testimonial = {
  id: number;
  name: string;
  location: string | null;
  rating: number;
  quote: string;
  avatar_url: string | null;
};

export type Paginated<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
};

async function get<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getDestinations(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return (await get<{ data: Destination[] }>(`/destinations${qs ? `?${qs}` : ""}`))?.data ?? [];
}

export async function getDestination(slug: string) {
  return (await get<{ data: Destination }>(`/destinations/${encodeURIComponent(slug)}`))?.data ?? null;
}

export async function getTours(params: Record<string, string | undefined> = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>;
  const qs = new URLSearchParams(clean).toString();
  return (await get<Paginated<Tour>>(`/tours${qs ? `?${qs}` : ""}`)) ?? { data: [] };
}

export async function getTour(slug: string) {
  return (await get<{ data: Tour }>(`/tours/${encodeURIComponent(slug)}`))?.data ?? null;
}

export async function getTestimonials() {
  return (await get<{ data: Testimonial[] }>("/testimonials"))?.data ?? [];
}
