export type Maintenance = { enabled: boolean; message: string | null; expected_back: string | null; updated_at: string | null };

const API_URL = process.env.API_URL ?? "http://localhost:8000/api/v1";

/** Live (uncached) read of the maintenance switch. Fails open: if the API cannot be reached the site stays up. */
export async function getMaintenance(): Promise<Maintenance> {
  try {
    const res = await fetch(`${API_URL}/meta/maintenance`, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!res.ok) return { enabled: false, message: null, expected_back: null, updated_at: null };
    return ((await res.json()) as { data: Maintenance }).data;
  } catch {
    return { enabled: false, message: null, expected_back: null, updated_at: null };
  }
}
