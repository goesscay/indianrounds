export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  first(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

/** Browser-side call to the Laravel API through the same-origin proxy. */
export async function apiFetch<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/backend/${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, json.message ?? "Something went wrong.", json.errors ?? {});
  }
  return json as T;
}

async function uploadImage(path: string, file: File): Promise<string> {
  const body = new FormData();
  body.append("image", file);
  const res = await fetch(`/api/backend/${path}`, { method: "POST", body, headers: { Accept: "application/json" }, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.errors?.image?.[0] ?? json.message ?? "Upload failed.", json.errors ?? {});
  return json.data.url as string;
}

/** Uploads a photo for a blog post and returns the address to use for it. */
export const uploadPostImage = (file: File) => uploadImage("admin/posts/upload-image", file);

/** Uploads a photo for a tour package and returns the address to use for it. */
export const uploadTourImage = (file: File) => uploadImage("admin/tours/upload-image", file);

/** Only allow same-site relative redirects after login. */
export function safeNext(next: string | null | undefined, fallback = "/bookings"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
