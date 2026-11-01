import { NextResponse } from "next/server";
import tripZones from "@/data/tripZones";
import { fetchConditionsForZones, isDegraded, parseZoneIds } from "@/lib/conditions/batch";

/** Complete responses match the 1h upstream cache. */
const CACHE_CONTROL_COMPLETE = "public, s-maxage=3600, stale-while-revalidate=600";
/** Responses with failed/timed-out lookups are cached only briefly so outages clear fast. */
const CACHE_CONTROL_DEGRADED = "public, s-maxage=60";

/** GET /api/conditions?ids=a,b,c → { conditions: { [zoneId]: LiveConditions } } */
export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids");
  const zones = parseZoneIds(ids, tripZones);
  if (zones.length === 0) {
    return NextResponse.json({ error: "No valid zone ids" }, { status: 400 });
  }
  const conditions = await fetchConditionsForZones(zones);
  const cacheControl = isDegraded(zones, conditions)
    ? CACHE_CONTROL_DEGRADED
    : CACHE_CONTROL_COMPLETE;
  return NextResponse.json({ conditions }, { headers: { "Cache-Control": cacheControl } });
}
