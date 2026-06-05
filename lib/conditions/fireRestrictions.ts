import type { FireRestriction } from "./types";

const USFS_FIRE_URL =
  "https://apps.fs.usda.gov/arcgis/rest/services/EDW/EDW_FireRestrictions_01/MapServer/0/query";

const BLM_CLOSURE_URL =
  "https://gis.blm.gov/arcgis/rest/services/lands_and_realty/BLM_National_Conservation_Lands/FeatureServer/0/query";

const LEVEL_ORDER: Record<string, number> = {
  "Stage 2": 3,
  Closure: 3,
  "Stage 1": 2,
  Prevention: 1,
};

function parseLevel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.includes("2") || upper.includes("CLOSURE")) return "Stage 2";
  if (upper.includes("1") || upper.includes("PREVENTION")) return "Stage 1";
  return raw;
}

function highestLevel(a: string | null, b: string | null): string | null {
  const aScore = LEVEL_ORDER[a ?? ""] ?? 0;
  const bScore = LEVEL_ORDER[b ?? ""] ?? 0;
  if (aScore >= bScore) return a;
  return b;
}

async function fetchUsfsRestrictions(
  lat: number,
  lng: number
): Promise<FireRestriction | null> {
  try {
    const url =
      `${USFS_FIRE_URL}?f=json` +
      `&geometryType=esriGeometryPoint` +
      `&geometry=${encodeURIComponent(JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }))}` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&distance=80&units=esriSRUnit_StatuteMile` +
      `&outFields=RESTRICTI1,UNITNAME,FORESTNAME,STAGE` +
      `&returnGeometry=false&resultRecordCount=10`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const features: { attributes: Record<string, string | null> }[] =
      data?.features ?? [];

    if (features.length === 0) {
      return {
        hasActiveRestriction: false,
        restrictionLevel: null,
        affectedArea: null,
        source: "usfs",
        fetchedAt: new Date().toISOString(),
      };
    }

    let worstLevel: string | null = null;
    let affectedArea: string | null = null;
    for (const f of features) {
      const attrs = f.attributes;
      const rawLevel = attrs.RESTRICTI1 ?? attrs.STAGE ?? null;
      const level = parseLevel(rawLevel);
      if (highestLevel(level, worstLevel) === level && level !== null) {
        worstLevel = level;
        affectedArea = attrs.FORESTNAME ?? attrs.UNITNAME ?? null;
      }
    }

    return {
      hasActiveRestriction: worstLevel !== null,
      restrictionLevel: worstLevel,
      affectedArea,
      source: "usfs",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchBlmClosures(
  lat: number,
  lng: number
): Promise<FireRestriction | null> {
  try {
    const url =
      `${BLM_CLOSURE_URL}?f=json` +
      `&geometryType=esriGeometryPoint` +
      `&geometry=${encodeURIComponent(JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }))}` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&distance=80&units=esriSRUnit_StatuteMile` +
      `&outFields=NLCS_NAME,CLOSURE_STATUS` +
      `&returnGeometry=false&resultRecordCount=5`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const features: { attributes: Record<string, string | null> }[] =
      data?.features ?? [];

    const hasClosure = features.some(
      (f) =>
        f.attributes.CLOSURE_STATUS?.toUpperCase().includes("CLOSED") ||
        f.attributes.CLOSURE_STATUS?.toUpperCase().includes("RESTRICTED")
    );

    return {
      hasActiveRestriction: hasClosure,
      restrictionLevel: hasClosure ? "Closure" : null,
      affectedArea:
        features.find((f) =>
          f.attributes.CLOSURE_STATUS?.toUpperCase().includes("CLOSED")
        )?.attributes.NLCS_NAME ?? null,
      source: "blm",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Returns the most severe active fire restriction within ~80 miles.
 * Checks USFS fire restrictions first, then BLM closures.
 * Returns null if both sources fail.
 */
export async function fetchFireRestrictions(
  lat: number,
  lng: number
): Promise<FireRestriction | null> {
  const [usfs, blm] = await Promise.allSettled([
    fetchUsfsRestrictions(lat, lng),
    fetchBlmClosures(lat, lng),
  ]);

  const usfsResult = usfs.status === "fulfilled" ? usfs.value : null;
  const blmResult = blm.status === "fulfilled" ? blm.value : null;

  if (usfsResult?.hasActiveRestriction) return usfsResult;
  if (blmResult?.hasActiveRestriction) return blmResult;
  return usfsResult ?? blmResult;
}
