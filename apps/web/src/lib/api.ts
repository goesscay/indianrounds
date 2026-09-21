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

export type Milestone = {
  id: number;
  sequence: number;
  label: string;
  due_on: string;
  amount: number;
  status: "due" | "paid" | "cancelled";
  paid_at: string | null;
};

export type Booking = {
  reference: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "expired";
  traveller_count: number;
  unit_price: number;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  paid_amount: number;
  credit_applied: number;
  cancelled_at: string | null;
  cancellation_deduction: number | null;
  cancellation_outcome: "credit_note" | "refund" | "none" | null;
  gst_state: string;
  reserved_until: string | null;
  created_at: string;
  contact: { name: string; phone: string; email: string };
  tour: { title: string; slug: string; duration_nights: number };
  variant: string | null;
  departure: { starts_on: string; ends_on: string };
  travellers: { name: string; age: number | null; gender: string | null }[];
  milestones: Milestone[];
};

export type Invoice = {
  invoice_number: string;
  issued_on: string;
  reference: string;
  status: string;
  bill_to: { name: string; email: string; phone: string; state: string };
  line: { description: string; departure: string; quantity: number; unit_price: number; amount: number };
  tax: { rate_percent: number; type: "CGST+SGST" | "IGST"; cgst: number; sgst: number; igst: number; total: number };
  total: number;
  credit_applied: number;
  paid: number;
  balance: number;
};

export type CreditNote = {
  id: number;
  code: string;
  amount: number;
  currency: string;
  issued_on: string;
  expires_on: string;
  status: "active" | "redeemed" | "expired";
  source: string;
  source_tour: string;
};

export type Grievance = {
  reference: string;
  subject: string;
  description: string;
  booking_reference: string | null;
  stage: 1 | 2 | 3;
  status: "open" | "resolved";
  officer_name: string | null;
  created_at: string;
  acknowledged_at: string | null;
  ack_due_at: string;
  resolve_by: string;
  statutory_deadline: string;
  resolved_at: string | null;
};

export type CancellationPreview = {
  reference: string;
  can_cancel: boolean;
  reason: string | null;
  days_before_departure: number;
  total: number;
  paid: number;
  tier_percent: number;
  advance?: number;
  deduction: number;
  returnable: number;
  outcome: "credit_note" | "refund";
};
