import { NextResponse } from "next/server";
import tripZones from "@/data/tripZones";
import { fetchConditionsForZones, parseZoneIds } from "@/lib/conditions/batch";

/** Upstream data is cached for an hour; let the CDN reuse batch responses too. */
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=600";

/** GET /api/conditions?ids=a,b,c → { conditions: { [zoneId]: LiveConditions } } */
export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids");
  const zones = parseZoneIds(ids, tripZones);
  if (zones.length === 0) {
    return NextResponse.json({ error: "No valid zone ids" }, { status: 400 });
  }
  const conditions = await fetchConditionsForZones(zones);
  return NextResponse.json({ conditions }, { headers: { "Cache-Control": CACHE_CONTROL } });
}
