import { UPSTREAM_TIMEOUT_MS } from "./config";
import type { RidbFacility } from "./types";

const RIDB_BASE = "https://ridb.recreation.gov/api/v1";

function apiKey(): string {
  return process.env.RIDB_API_KEY ?? "";
}

function parseStatus(raw: unknown): RidbFacility["status"] {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  if (upper.includes("CLOSE")) return "Closed";
  if (upper.includes("LIMITED") || upper.includes("PARTIAL")) return "Limited";
  if (upper.includes("OPEN")) return "Open";
  return null;
}

/**
 * Returns up to `limit` RIDB facilities within `radiusMiles` of the given
 * coordinates. Returns an empty array if the API key is missing or the
 * request fails — callers must not depend on this data being present.
 */
export async function fetchNearbyFacilities(
  lat: number,
  lng: number,
  radiusMiles = 50,
  limit = 5,
  timeoutMs: number = UPSTREAM_TIMEOUT_MS
): Promise<RidbFacility[]> {
  const key = apiKey();
  if (!key) return [];

  try {
    const url =
      `${RIDB_BASE}/facilities` +
      `?latitude=${lat}&longitude=${lng}` +
      `&radius=${radiusMiles}&limit=${limit}` +
      `&full=true`;

    const res = await fetch(url, {
      headers: { apikey: key, Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const items: Record<string, unknown>[] = data?.RECDATA ?? [];

    return items.map((item) => ({
      facilityId: String(item.FacilityID ?? ""),
      facilityName: String(item.FacilityName ?? ""),
      facilityType: String(item.FacilityTypeDescription ?? ""),
      reservable: Boolean(item.Reservable),
      status: parseStatus(item.FacilityAdaAccess ?? item.FacilityDescription),
    }));
  } catch {
    return [];
  }
}
