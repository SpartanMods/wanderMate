import type { TripPreferences } from "./types";
import { decodePrefs } from "./prefHash";
import { validatePreferences } from "./validation";

const LEGACY_KEY = "wandermate:preferences";

/**
 * @deprecated Use buildResultsUrl from lib/prefHash instead.
 * Kept for backward compatibility with old localStorage sessions.
 */
export function savePreferences(prefs: TripPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be unavailable (private mode, quota). Fail quietly.
  }
}

/**
 * Load preferences from the URL `p` param first; fall back to localStorage
 * for sessions that pre-date URL-based state.
 */
export function loadPreferences(): TripPreferences | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const p = params.get("p");
  if (p) return decodePrefs(p);
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const result = validatePreferences(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}
