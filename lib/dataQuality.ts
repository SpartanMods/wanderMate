/*
 * Data-quality helpers for WanderMate.
 *
 * The seed data is manually curated and not live. These utilities turn the
 * structured `TripDataQuality` / legality / remoteness fields into
 * human-readable labels, tones, and "verify this before you go" warnings so
 * the UI can stay honest without becoming a data table.
 */

import type {
  ConfidenceLevel,
  LandManagerType,
  SensitiveLocationLevel,
  TripZone,
  VerificationLinkCategory,
} from "./types";

export const LAND_MANAGER_LABELS: Record<LandManagerType, string> = {
  usfs: "US Forest Service",
  blm: "Bureau of Land Management",
  nps: "National Park Service",
  state: "State land / parks",
  county: "County",
  city: "City / municipal",
  private: "Private land",
  mixed: "Mixed ownership",
  unknown: "Unknown manager",
};

export const VERIFICATION_CATEGORY_LABELS: Record<
  VerificationLinkCategory,
  string
> = {
  land_manager: "Land manager",
  camping: "Camping",
  ohv: "OHV",
  fire: "Fire",
  road: "Road / closures",
  weather: "Weather",
  general: "General",
};

/** Short, human label for a confidence level. */
export function formatConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
  }
}

/** Maps a confidence level to a Badge tone. */
export function confidenceTone(
  level: ConfidenceLevel
): "moss" | "sand" | "rust" {
  if (level === "high") return "moss";
  if (level === "medium") return "sand";
  return "rust";
}

/** Sensitive-location protection copy, or null when nothing to surface. */
export function sensitiveLocationNote(
  level: SensitiveLocationLevel
): string | null {
  switch (level) {
    case "none":
      return null;
    case "generalized":
      return "Described as a general area only — exact sites are intentionally not listed.";
    case "fragile":
      return "Ecologically or culturally fragile: location deliberately kept coarse. Tread lightly and follow Leave No Trace.";
    case "restricted":
      return "Access here is legally restricted; specific details are withheld. Confirm what is open before you go.";
  }
}

/** Format an ISO date (YYYY-MM-DD) for display, e.g. "May 2026". */
export function formatReviewedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Roughly how stale a review is, in whole months, vs. now. */
export function reviewAgeMonths(iso: string, now: Date = new Date()): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(
    0,
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  );
}

/**
 * Concrete things a user should verify for a zone, derived from its legality,
 * remoteness, and any lower-confidence data categories. Ordered most-to-least
 * safety-relevant and de-duplicated.
 */
export function getDataQualityWarnings(trip: TripZone): string[] {
  const out: string[] = [];
  const { legality, remoteness, dataQuality } = trip;

  if (legality.permitLikelyRequired) {
    out.push("A permit is likely required — check the managing agency.");
  }
  if (legality.dispersedCampingAllowed === "seasonal") {
    out.push("Dispersed camping is seasonal here — confirm current dates.");
  } else if (
    legality.dispersedCampingAllowed === "no" ||
    legality.dispersedCampingAllowed === "unknown"
  ) {
    out.push("Confirm where dispersed camping is actually allowed.");
  }
  if (legality.campfireRestrictionsCommon) {
    out.push("Campfire restrictions are common — check current fire rules.");
  }
  if (legality.ohvLegal === "area_specific") {
    out.push("OHV use is route/area specific — ride only designated trails.");
  } else if (legality.ohvLegal === "unknown") {
    out.push("OHV legality is unclear — verify before riding.");
  }
  if (legality.platedVehicleRequired === "yes") {
    out.push("Street-legal (plated) vehicles may be required on some roads.");
  }
  if (
    remoteness.waterAvailability === "none" ||
    remoteness.waterAvailability === "limited"
  ) {
    out.push("Little or no reliable water — pack your own.");
  }
  if (remoteness.cellServiceLikelihood <= 2) {
    out.push("Cell service is unlikely — carry offline navigation / a beacon.");
  }
  if (trip.roadAccess.winterAccessRisk >= 4) {
    out.push("Winter/shoulder-season access can close — verify road status.");
  }

  // Surface low-confidence categories explicitly.
  if (dataQuality.access.level === "low") {
    out.push("Access details are low-confidence — double-check the route.");
  }
  if (dataQuality.legality.level === "low") {
    out.push("Rules data is low-confidence — verify permits, fire & OHV rules.");
  }

  return Array.from(new Set(out));
}

/**
 * A compact summary for the "verification needed" UI row: the top things to
 * check plus how many verification links are attached.
 */
export function getVerificationSummary(trip: TripZone): {
  topWarnings: string[];
  totalWarnings: number;
  linkCount: number;
} {
  const warnings = getDataQualityWarnings(trip);
  return {
    topWarnings: warnings.slice(0, 3),
    totalWarnings: warnings.length,
    linkCount: trip.verificationLinks.length,
  };
}
