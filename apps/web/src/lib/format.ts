export function formatINR(value: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(value)}`;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatMonth(iso: string): string {
  return formatDate(iso, { month: "long", year: "numeric" });
}

export function durationLabel(nights: number, days: number): string {
  return `${days} Days ${nights} Nights`;
}
