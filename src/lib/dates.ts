import { format, parseISO } from "date-fns";

/** "2026-11-14" → a Date at local midnight (no timezone shift). */
function fromIsoDate(iso: string): Date {
  return parseISO(iso);
}

/** Day headers: "Sat, Nov 14", adding the year when it isn't this year. */
export function formatDay(iso: string, now = new Date()): string {
  const date = fromIsoDate(iso);
  return date.getFullYear() === now.getFullYear()
    ? format(date, "EEE, MMM d")
    : format(date, "EEE, MMM d, yyyy");
}

/** Table cells: "Nov 14". */
export function formatShortDay(iso: string): string {
  return format(fromIsoDate(iso), "MMM d");
}

/**
 * A group's date span: "Nov 12 – 15", "Oct 30 – Nov 2", "Dec 30, 2025 –
 * Jan 2, 2026", or a single "Nov 14".
 */
export function formatDateRange(first: string, last: string): string {
  const a = fromIsoDate(first);
  const b = fromIsoDate(last);
  if (first === last) return format(a, "MMM d");
  if (a.getFullYear() !== b.getFullYear()) {
    return `${format(a, "MMM d, yyyy")} – ${format(b, "MMM d, yyyy")}`;
  }
  if (a.getMonth() === b.getMonth()) {
    return `${format(a, "MMM d")} – ${format(b, "d")}`;
  }
  return `${format(a, "MMM d")} – ${format(b, "MMM d")}`;
}

/** Today's date as YYYY-MM-DD in the viewer's timezone. */
export function todayIso(now = new Date()): string {
  return format(now, "yyyy-MM-dd");
}
