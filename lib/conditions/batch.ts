import type { TripZone } from "@/lib/types";
import { fetchLiveConditions } from "./index";
import type { ConditionsByZone } from "./types";

/** Parses `ids=a,b,c`, keeping only known zone ids (deduplicated, input order). */
export function parseZoneIds(raw: string | null, zones: TripZone[]): TripZone[] {
  if (!raw) return [];
  const byId = new Map(zones.map((z) => [z.id, z]));
  const seen = new Set<string>();
  const result: TripZone[] = [];
  for (const part of raw.split(",")) {
    const zone = byId.get(part.trim());
    if (zone && !seen.has(zone.id)) {
      seen.add(zone.id);
      result.push(zone);
    }
  }
  return result;
}

/**
 * Fetches live conditions for every zone concurrently. Zones are independent:
 * one failing (or timing out) never blocks or fails the others; a zone whose
 * fetch rejected is simply left out, which callers treat as unknown.
 */
export async function fetchConditionsForZones(zones: TripZone[]): Promise<ConditionsByZone> {
  const settled = await Promise.allSettled(zones.map((z) => fetchLiveConditions(z)));
  const result: ConditionsByZone = {};
  settled.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") result[zones[i].id] = outcome.value;
  });
  return result;
}
