export type SeasonKey = "on" | "mid" | "off";
export type Season = { months: string; places: string; activities: string };
export type Seasons = Partial<Record<SeasonKey, Season>>;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Oct–Mar" -> [9,10,11,0,1,2] (ranges may wrap the year; a single month works too). Null when the text is not a month range. */
export function monthsInRange(text: string): number[] | null {
  const m = text.trim().toLowerCase().match(/^([a-z]{3})[a-z]*(?:\s*(?:-|–|—|to)\s*([a-z]{3})[a-z]*)?$/);
  if (!m) return null;
  const from = MONTHS.indexOf(m[1]);
  const to = m[2] === undefined ? from : MONTHS.indexOf(m[2]);
  if (from < 0 || to < 0) return null;
  const out: number[] = [];
  for (let i = from; ; i = (i + 1) % 12) {
    out.push(i);
    if (i === to) break;
  }
  return out;
}

/** Which season each of the 12 months (Jan..Dec) falls in. Null if any season's months cannot be read, so we never draw a misleading strip. */
export function seasonByMonth(seasons: Seasons): (SeasonKey | null)[] | null {
  const strip: (SeasonKey | null)[] = Array(12).fill(null);
  for (const key of ["on", "mid", "off"] as const) {
    const s = seasons[key];
    if (!s) continue;
    const months = monthsInRange(s.months);
    if (!months) return null;
    for (const i of months) strip[i] ??= key;
  }
  return strip;
}
