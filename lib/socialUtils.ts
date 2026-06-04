/*
 * Small, pure helpers for the social layer: slug generation, date formatting,
 * safe parsing, and id generation. Kept separate from lib/utils.ts so the
 * social foundation stays self-contained and easy to remove or replace.
 */

/**
 * Turn a title into a URL-safe slug.
 *   "Flat Tops Basecamp Weekend!" -> "flat-tops-basecamp-weekend"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accent marks
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .replace(/-{2,}/g, "-"); // collapse repeats
}

/**
 * Generate a slug guaranteed not to collide with `existing`. Appends -2, -3, …
 * until unique. Falls back to a stable token if the title slugifies to empty.
 */
export function uniqueSlug(title: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  const base = slugify(title) || "trip-journal";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Best-effort unique id. Uses crypto.randomUUID when available, otherwise a
 * timestamp + random fallback. Good enough for client-side local records.
 */
export function generateId(prefix = "id"): string {
  const cryptoObj =
    typeof globalThis !== "undefined"
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;
  if (cryptoObj?.randomUUID) {
    return `${prefix}_${cryptoObj.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** Current time as an ISO date-time string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Format an ISO date (YYYY-MM-DD or full ISO) as e.g. "Jun 4, 2026".
 * Returns the raw input if it can't be parsed, so display never crashes.
 */
export function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format a start/end date pair as a human range.
 *   ("2026-06-04", "2026-06-07") -> "Jun 4 – 7, 2026"
 *   ("2026-06-04")               -> "Jun 4, 2026"
 */
export function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  if (start && !end) return formatDate(start);
  if (!start && end) return formatDate(end);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * Coerce an unknown value into an array of T. Anything non-array (including
 * null/undefined from a malformed localStorage payload) becomes []. Optionally
 * filter elements with a guard so a single bad item can't poison the list.
 */
export function safeArray<T>(value: unknown, guard?: (item: unknown) => item is T): T[] {
  if (!Array.isArray(value)) return [];
  if (!guard) return value as T[];
  return value.filter(guard);
}

/** Narrow an unknown to a plain string array, dropping non-strings. */
export function safeStringArray(value: unknown): string[] {
  return safeArray(value, (item): item is string => typeof item === "string");
}
