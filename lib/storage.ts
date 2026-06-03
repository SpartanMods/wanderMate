/*
 * Lightweight client-side persistence for trip preferences. No database,
 * no auth — preferences live in localStorage so the results page can read
 * what the planner wrote, and the user can refine and re-run.
 */

import type { TripPreferences } from "./types";

const KEY = "wandermate:preferences";

export function savePreferences(prefs: TripPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be unavailable (private mode, quota). Fail quietly.
  }
}

export function loadPreferences(): TripPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TripPreferences;
  } catch {
    return null;
  }
}

export function clearPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
