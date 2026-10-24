import type { FireLevel, FireRestriction } from "./types";

const USFS_FIRE_URL =
  "https://apps.fs.usda.gov/arcgis/rest/services/EDW/EDW_FireRestrictions_01/MapServer/0/query";

const BLM_CLOSURE_URL =
  "https://gis.blm.gov/arcgis/rest/services/lands_and_realty/BLM_National_Conservation_Lands/FeatureServer/0/query";

const LEVEL_ORDER: Record<FireLevel, number> = {
  "Stage 1": 1,
  "Stage 2": 2,
  "Stage 3": 3,
  Closure: 3,
};

/** Phrases meaning a restriction is not (or no longer) in effect. Checked first. */
const NO_RESTRICTION_PATTERN =
  /\b(lifted|rescinded|rescind|no (fire )?restrictions?|none)\b/i;

/** Advisory-only language; counts as no restriction when no stage is named. */
const ADVISORY_PATTERN = /\bprevention\b/i;

const CLOSURE_PATTERN = /\b(closure|closed|full fire ban)\b/i;

/** "Stage" followed by a level in digit, roman, or word form: "Stage 2", "STAGE-II", "stage two". */
const STAGE_PATTERN = /\bstage[\s\-_:#]*(3|2|1|iii|ii|i|three|two|one)\b/gi;

const STAGE_TOKEN_TO_LEVEL: Record<string, FireLevel> = {
  "1": "Stage 1",
  i: "Stage 1",
  one: "Stage 1",
  "2": "Stage 2",
  ii: "Stage 2",
  two: "Stage 2",
  "3": "Stage 3",
  iii: "Stage 3",
  three: "Stage 3",
};

export type ParsedFireLevel =
  | { kind: "level"; level: FireLevel }
  | { kind: "none" }
  | { kind: "unknown" };

/**
 * Fuzzy-parses a raw restriction value. Only an explicit stage phrase or
 * closure language counts as a restriction; a bare digit never does.
 */
export function parseLevel(raw: string | null | undefined): ParsedFireLevel {
  if (!raw || raw.trim() === "") return { kind: "unknown" };
  if (NO_RESTRICTION_PATTERN.test(raw)) return { kind: "none" };
  if (CLOSURE_PATTERN.test(raw)) return { kind: "level", level: "Closure" };

  let worst: FireLevel | null = null;
  for (const match of Array.from(raw.matchAll(STAGE_PATTERN))) {
    const level = STAGE_TOKEN_TO_LEVEL[match[1].toLowerCase()];
    if (level) worst = highestLevel(worst, level);
  }
  if (worst) return { kind: "level", level: worst };
  if (ADVISORY_PATTERN.test(raw)) return { kind: "none" };
  return { kind: "unknown" };
}

function highestLevel(a: FireLevel | null, b: FireLevel): FireLevel {
  if (a === null) return b;
  return LEVEL_ORDER[b] > LEVEL_ORDER[a] ? b : a;
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

    let worstLevel: FireLevel | null = null;
    let affectedArea: string | null = null;
    let hasUnparseable = false;
    for (const f of features) {
      const attrs = f.attributes;
      const parsed = parseLevel(attrs.RESTRICTI1 ?? attrs.STAGE ?? null);
      if (parsed.kind === "unknown") hasUnparseable = true;
      if (parsed.kind !== "level") continue;
      const next = highestLevel(worstLevel, parsed.level);
      if (next !== worstLevel) {
        worstLevel = next;
        affectedArea = attrs.FORESTNAME ?? attrs.UNITNAME ?? null;
      }
    }

    // Restriction text we can't interpret is unknown, never an all-clear.
    if (worstLevel === null && hasUnparseable) return null;

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
