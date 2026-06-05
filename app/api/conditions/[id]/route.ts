import { NextResponse } from "next/server";
import tripZones from "@/data/tripZones";
import { fetchLiveConditions } from "@/lib/conditions";

export const revalidate = 3600; // cache 1 hour at the CDN layer

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const zone = tripZones.find((z) => z.id === params.id);
  if (!zone) {
    return NextResponse.json({ error: "Zone not found" }, { status: 404 });
  }
  const conditions = await fetchLiveConditions(zone);
  return NextResponse.json(conditions);
}
