// Upstream fire-restriction layers (#11). Each source's URL, fields and
// coded values were verified live against the layer metadata (`<layer>?f=json`)
// on 2026-11-02; see the research comments on issue #11.
//
// Every response is validated with a Zod schema. A schema mismatch (a missing
// field, an unexpected coded value, an ArcGIS error body) is an error, which
// callers treat as unknown — never as "no restriction".
import { z } from "zod";
import type { FireLevel, FireSourceId } from "./types";

/** Restrictions within this distance of a zone's point count for the zone (#11 decision: 10 mi). */
export const FIRE_SEARCH_RADIUS_MILES = 10;

/** Max features read per source query; well above any real result near one zone. */
const MAX_FEATURES = 200;

/** Orders' effective/rescind dates are local calendar dates in the Mountain time zone. */
const FIRE_ORDER_TIME_ZONE = "America/Denver";

/** Today's date (YYYY-MM-DD) in FIRE_ORDER_TIME_ZONE, for comparing with order dates. */
export function todayForFireOrders(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: FIRE_ORDER_TIME_ZONE }).format(now);
}

/**
 * Why a source couldn't answer. Only `failed` is a lookup problem worth
 * retrying and not caching; the others are stable facts about the data.
 */
export type UnknownReason =
  /** Network/HTTP error, timeout, ArcGIS error body, schema mismatch, truncated result. */
  | "failed"
  /** A blanket-coverage layer has no polygon near the point. */
  | "not_covered"
  /** Nothing in force, but some feature's status was empty. */
  | "unreadable";

type Restriction = { kind: "restriction"; level: FireLevel; area: string | null };
type Clear = { kind: "clear" };

/** What one source says about the area around a zone. */
export type SourceAnswer = Restriction | Clear | { kind: "unknown"; reason: UnknownReason };

/** One feature's reading: a restriction, nothing in force, or unreadable. */
type FeatureReading = Restriction | Clear | { kind: "unreadable" };

export const unknownAnswer = (reason: UnknownReason): SourceAnswer => ({ kind: "unknown", reason });

export type FireSource<Attrs> = {
  id: FireSourceId;
  /** ArcGIS feature layer URL (no trailing /query). */
  layerUrl: string;
  /** SQL filter applied server-side. */
  where: string;
  outFields: readonly string[];
  attributes: z.ZodType<Attrs>;
  /**
   * Reads one validated feature. `today` is todayForFireOrders(), for orders
   * whose dates decide whether they're in force.
   * Method syntax so a FireSource<X> is usable where FireSource<unknown> is expected.
   */
  read(attrs: Attrs, today: string): FeatureReading;
  /**
   * True when the layer has a polygon for every place it covers (each BLM
   * unit, each ranger district), so finding no polygon near a zone means the
   * source doesn't cover it: unknown, not clear. False when polygons exist
   * only where an order is in force.
   */
  blanketCoverage: boolean;
};

const joinArea = (...parts: (string | null)[]): string | null =>
  parts.filter((p): p is string => Boolean(p && p.trim())).join(", ") || null;

// --- BLM, Rocky Mountain Area (CO, WY, NE, SD) -------------------------------
// Owner USWFS_RM_Authoritative (NIFC org), edited by CO_BLM_Authoritative.
// One polygon per BLM field office × county. Coded domain dom_restr_stage.

const BLM_RMA_STATUS = ["Stage 1", "Stage 2", "Year Round"] as const;

const blmRmaAttributes = z.object({
  restriction_status: z.enum(BLM_RMA_STATUS).nullable(),
  admin_unit_nm: z.string().nullable(),
  county_name: z.string().nullable(),
  state: z.string().nullable(),
});

export const BLM_RMA_SOURCE: FireSource<z.infer<typeof blmRmaAttributes>> = {
  id: "blm-rma",
  layerUrl:
    "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Rocky_Mountain_Area_BLM_Fire_Restriction_Polygons_NEW_VIEW/FeatureServer/0",
  where: "1=1",
  outFields: ["restriction_status", "admin_unit_nm", "county_name", "state"],
  attributes: blmRmaAttributes,
  read: (a) => {
    const area = joinArea(a.admin_unit_nm, a.county_name);
    switch (a.restriction_status) {
      case "Stage 1":
      case "Stage 2":
        return { kind: "restriction", level: a.restriction_status, area };
      // Standing year-round rules (fireworks, exploding targets) are the
      // baseline on almost every BLM unit, not a seasonal stage (#11 decision).
      case "Year Round":
        return { kind: "clear" };
      case null:
        return { kind: "unreadable" };
    }
  },
  blanketCoverage: true,
};

// --- Utah FFSL statewide restrictions (all agencies in Utah) -----------------
// Owner FireFFSL (Utah Division of Forestry, Fire & State Lands): FFSL, USFS,
// BLM, NPS and tribal orders. A polygon exists only where an order exists,
// so we read only orders that can be in force today.

const UTAH_RESTRICTION_TYPES = [
  "Prevention Order",
  "Stage 1",
  "Stage 2",
  "Stage 3",
  "Special Order",
  "Ordinance",
  "Other",
  "NPS Order",
  "Closure",
] as const;

/**
 * Status codes (coded domain names in parentheses) for orders that can be in
 * force today. Excluded: Rescinded, Superseded, Future ("Effective Date in Future").
 */
const UTAH_IN_FORCE_STATUSES = [
  "Active",
  "Standing", // "Standing Order"
  "Future_Rescind", // "Rescindment Date in Future": in force until that date
  "Future_Supersede", // "Superseded in Future": in force until replaced
  "Recurring", // "Recurring Order": in force between EffectiveDate and RescindedDate
] as const;

/** ArcGIS DateOnly fields arrive as "YYYY-MM-DD". */
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

const utahAttributes = z.object({
  RestrictionType: z.enum(UTAH_RESTRICTION_TYPES).nullable(),
  Status: z.enum(UTAH_IN_FORCE_STATUSES),
  EffectiveDate: dateOnly,
  RescindedDate: dateOnly,
  Agency: z.string().nullable(),
  Short_AreaDescription: z.string().nullable(),
});

type UtahAttributes = z.infer<typeof utahAttributes>;

/** Recurring orders are in force only within this season's date window. */
function utahOrderInForce(a: UtahAttributes, today: string): boolean | "unreadable" {
  if (a.Status !== "Recurring") return true;
  if (!a.EffectiveDate || !a.RescindedDate) return "unreadable";
  // YYYY-MM-DD strings compare chronologically.
  return a.EffectiveDate <= today && today <= a.RescindedDate;
}

export const UTAH_FFSL_SOURCE: FireSource<UtahAttributes> = {
  id: "utah-ffsl",
  layerUrl:
    "https://services.arcgis.com/ZzrwjTRez6FJiOq4/arcgis/rest/services/Fire_Restrictions/FeatureServer/0",
  where: `Status IN (${UTAH_IN_FORCE_STATUSES.map((s) => `'${s}'`).join(", ")})`,
  outFields: ["RestrictionType", "Status", "EffectiveDate", "RescindedDate", "Agency", "Short_AreaDescription"],
  attributes: utahAttributes,
  read: (a, today) => {
    const inForce = utahOrderInForce(a, today);
    if (inForce === "unreadable") return { kind: "unreadable" };
    if (!inForce) return { kind: "clear" };
    const area = a.Short_AreaDescription;
    switch (a.RestrictionType) {
      case "Stage 1":
      case "Stage 2":
      case "Stage 3":
        return { kind: "restriction", level: a.RestrictionType, area };
      case "Closure":
        return { kind: "restriction", level: "Closure", area };
      // Standing, site-specific or advisory orders are not seasonal stages
      // and count as no restriction (#11 decision).
      case "Prevention Order":
      case "Special Order":
      case "Ordinance":
      case "Other":
      case "NPS Order":
        return { kind: "clear" };
      case null:
        return { kind: "unreadable" };
    }
  },
  blanketCoverage: false,
};

// --- USFS Pike & San Isabel NFs (PSICC) ranger districts ---------------------
// Owner USFSRegion02. One polygon per ranger district. Coded domain
// RestrictionLevel: '1' = No Restrictions, '2' = Stage 1, '3' = Stage 2.
// NOTE: the service name carries a year. If the forest replaces it, queries
// fail with ArcGIS error 400 "Invalid URL", which is logged as a config error
// (see interpretResponse); update the URL from the USFSRegion02 org listing.

const PSICC_LEVEL_BY_CODE = {
  "1": null,
  "2": "Stage 1",
  "3": "Stage 2",
} as const satisfies Record<string, FireLevel | null>;

const psiccAttributes = z.object({
  FireRestct: z.enum(["1", "2", "3"]).nullable(),
  DISTRICTNA: z.string().nullable(),
  FORESTNAME: z.string().nullable(),
});

export const USFS_PSICC_SOURCE: FireSource<z.infer<typeof psiccAttributes>> = {
  id: "usfs-psicc",
  layerUrl:
    "https://services1.arcgis.com/gGHDlz6USftL5Pau/arcgis/rest/services/PSICCRangerDistrictsFireRestrictions_2026/FeatureServer/3",
  where: "1=1",
  outFields: ["FireRestct", "DISTRICTNA", "FORESTNAME"],
  attributes: psiccAttributes,
  read: (a) => {
    if (a.FireRestct === null) return { kind: "unreadable" };
    const level = PSICC_LEVEL_BY_CODE[a.FireRestct];
    if (level === null) return { kind: "clear" };
    return { kind: "restriction", level, area: joinArea(a.DISTRICTNA, a.FORESTNAME) };
  },
  blanketCoverage: true,
};

export const FIRE_SOURCES = {
  "blm-rma": BLM_RMA_SOURCE,
  "utah-ffsl": UTAH_FFSL_SOURCE,
  "usfs-psicc": USFS_PSICC_SOURCE,
} satisfies Record<FireSourceId, FireSource<unknown>>;

/** Extra query parameter ArcGIS ignores; varying it gives a fresh cache key (see fireRestrictions.ts). */
export const CACHE_KEY_PARAM = "cacheKey";

/** ArcGIS query URL for features within the search radius of a point. */
export function buildQueryUrl(
  source: FireSource<unknown>,
  lat: number,
  lng: number,
  cacheKey?: string
): string {
  const params = new URLSearchParams({
    f: "json",
    where: source.where,
    geometryType: "esriGeometryPoint",
    geometry: JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }),
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: String(FIRE_SEARCH_RADIUS_MILES),
    units: "esriSRUnit_StatuteMile",
    outFields: source.outFields.join(","),
    returnGeometry: "false",
    resultRecordCount: String(MAX_FEATURES),
  });
  if (cacheKey) params.set(CACHE_KEY_PARAM, cacheKey);
  return `${source.layerUrl}/query?${params.toString()}`;
}

const LEVEL_ORDER: Record<FireLevel, number> = {
  "Stage 1": 1,
  "Stage 2": 2,
  "Stage 3": 3,
  Closure: 3,
};

export function worseLevel(a: FireLevel, b: FireLevel): FireLevel {
  return LEVEL_ORDER[b] > LEVEL_ORDER[a] ? b : a;
}

/** ArcGIS reports errors as HTTP 200 with this body. */
const arcgisError = z.object({ error: z.object({ code: z.number(), message: z.string() }) });

/** ArcGIS 400 = bad layer URL or field list: our config is out of date, not an outage. */
const ARCGIS_CONFIG_ERROR_CODE = 400;

/** ArcGIS query response. */
const queryEnvelope = z.object({
  features: z.array(z.object({ attributes: z.unknown() })),
  exceededTransferLimit: z.boolean().optional(),
});

/**
 * Validates a query response body and reduces it to one answer. Returns
 * unknown when the body doesn't match the schema, when results were
 * truncated, when nothing is in force but some feature was unreadable, or when
 * a blanket-coverage layer has no polygon near the point.
 */
export function interpretResponse<Attrs>(
  source: FireSource<Attrs>,
  body: unknown,
  today: string = todayForFireOrders()
): SourceAnswer {
  const error = arcgisError.safeParse(body);
  if (error.success) {
    const { code, message } = error.data.error;
    if (code === ARCGIS_CONFIG_ERROR_CODE) {
      console.error(
        `[fire] ${source.id}: ArcGIS rejected the query (${message}). The layer URL or fields in fireSources.ts are probably out of date.`
      );
    } else {
      console.warn(`[fire] ${source.id}: ArcGIS error ${code}: ${message}`);
    }
    return unknownAnswer("failed");
  }

  const envelope = queryEnvelope.safeParse(body);
  if (!envelope.success) {
    console.warn(`[fire] ${source.id}: unexpected response shape`, envelope.error.issues[0]);
    return unknownAnswer("failed");
  }
  const { features, exceededTransferLimit } = envelope.data;
  // A truncated result could be missing the worst restriction.
  if (exceededTransferLimit) return unknownAnswer("failed");
  if (features.length === 0) {
    return source.blanketCoverage ? unknownAnswer("not_covered") : { kind: "clear" };
  }

  let worst: Restriction | null = null;
  let anyUnreadable = false;
  for (const feature of features) {
    const attrs = source.attributes.safeParse(feature.attributes);
    if (!attrs.success) {
      console.warn(`[fire] ${source.id}: feature failed schema validation`, attrs.error.issues[0]);
      return unknownAnswer("failed");
    }
    const reading = source.read(attrs.data, today);
    if (reading.kind === "unreadable") anyUnreadable = true;
    if (reading.kind !== "restriction") continue;
    if (!worst || worseLevel(worst.level, reading.level) !== worst.level) worst = reading;
  }
  if (worst) return worst;
  return anyUnreadable ? unknownAnswer("unreadable") : { kind: "clear" };
}
