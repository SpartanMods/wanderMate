import type { TripPreferences } from "./types";
import { validatePreferences } from "./validation";

/** Encode TripPreferences to a URL-safe base64 string. */
export function encodePrefs(prefs: TripPreferences): string {
  const json = JSON.stringify(prefs);
  const b64 = Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode a URL-safe base64 string back to TripPreferences. The `p` param is
 * user-controlled, so the result is validated; returns null on any failure.
 */
export function decodePrefs(encoded: string): TripPreferences | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    const result = validatePreferences(JSON.parse(json));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Build the /results URL with encoded prefs as the `p` query param. */
export function buildResultsUrl(prefs: TripPreferences): string {
  return `/results?p=${encodePrefs(prefs)}`;
}
