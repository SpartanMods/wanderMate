/*
 * Scoring engine for WanderMate.
 *
 * Turns a user's TripPreferences + a TripZone into a transparent 0-100
 * match score with a per-dimension breakdown, plain-English explanations,
 * and hard-constraint detection. All weights live in constants.ts so the
 * model stays tunable.
 */

import {
  ACTIVITY_LABELS,
  ACTIVITY_WEIGHT_MULTIPLIER,
  CAMPING_LABELS,
  RISK_LABELS,
  MISSING_MUST_HAVE_PENALTY,
  SCORE_WEIGHTS,
  SKILL_RANK,
  VEHICLE_LABELS,
  VEHICLE_RANK,
} from "./constants";
import type {
  ActivityKey,
  ScoreBreakdown,
  TripPreferences,
  TripZone,
  VehicleRequirement,
} from "./types";
import { getEffectiveDriveHours, resolveOrigin } from "./geo";
import { clamp, inferSeason } from "./utils";

/** Effective max drive time. A user picking "6+" means no real cap. */
function effectiveMaxDrive(maxDriveTimeHours: number): number {
  return maxDriveTimeHours >= 6 ? 99 : maxDriveTimeHours;
}

/** Effective vehicle rank, with "not sure" biased toward easier access. */
function userVehicleRank(
  vehicle: TripPreferences["vehicleCapability"]
): number {
  if (vehicle === "not_sure") return 2; // ~SUV, but we dampen hard access below
  return VEHICLE_RANK[vehicle as VehicleRequirement];
}

// ---------------------------------------------------------------------------
// Shared capability / context helpers used across scorers, guardrails, and
// explanations. Keeping them in one place keeps the risk model consistent.
// ---------------------------------------------------------------------------

/** Trip skill rank minus user skill rank. + = trip is harder than the user. */
function skillGap(prefs: TripPreferences, trip: TripZone): number {
  return SKILL_RANK[trip.skillLevel] - SKILL_RANK[prefs.experienceLevel];
}

/** Trip vehicle rank minus user vehicle rank. + = trip needs more capability. */
function vehicleGap(prefs: TripPreferences, trip: TripZone): number {
  return (
    VEHICLE_RANK[trip.vehicleRequirement] -
    userVehicleRank(prefs.vehicleCapability)
  );
}

/** Does the planned trip fall in winter (by start date), if a date was given? */
function isWinterContext(prefs: TripPreferences): boolean {
  return inferSeason(prefs.startDate) === "winter";
}

/** True when the structured data quality (or legacy field) reads "low" overall. */
function isOverallDataLow(trip: TripZone): boolean {
  if (trip.dataQuality) return trip.dataQuality.overall.level === "low";
  return trip.dataConfidence === "low";
}

/**
 * A 0..1 index of how risky/adventurous a trip is, blending off-grid level,
 * skill, vehicle demand, road difficulty, winter access (only when relevant),
 * cell-service likelihood, legality uncertainty, and data confidence. New
 * structured fields are used when present and degrade gracefully without them.
 */
function tripRiskIndex(prefs: TripPreferences, trip: TripZone): number {
  const parts: Array<{ value: number; weight: number }> = [];
  const add = (value: number, weight: number) =>
    parts.push({ value: clamp(value, 0, 1), weight });

  // Remoteness / off-grid (1-4).
  add((trip.offGridLevel - 1) / 3, 1.2);
  // Skill demand (1-4).
  add((SKILL_RANK[trip.skillLevel] - 1) / 3, 1);
  // Vehicle demand (1-4).
  add((VEHICLE_RANK[trip.vehicleRequirement] - 1) / 3, 1);

  const ra = trip.roadAccess;
  if (ra) {
    add((ra.accessRoadDifficulty - 1) / 4, 1.1);
    if (isWinterContext(prefs)) add((ra.winterAccessRisk - 1) / 4, 1);
  }

  const rm = trip.remoteness;
  if (rm) {
    // Low cell service = higher risk.
    add((5 - rm.cellServiceLikelihood) / 4, 0.8);
  }

  const lg = trip.legality;
  if (lg) {
    let legalUncertainty = 0;
    if (lg.ohvLegal === "unknown") legalUncertainty += 0.5;
    else if (lg.ohvLegal === "area_specific") legalUncertainty += 0.2;
    if (lg.dispersedCampingAllowed === "unknown") legalUncertainty += 0.3;
    if (lg.permitLikelyRequired) legalUncertainty += 0.2;
    add(legalUncertainty, 0.7);
  }

  if (trip.dataQuality) {
    const lvl = (l: "high" | "medium" | "low") =>
      l === "low" ? 1 : l === "medium" ? 0.4 : 0;
    add(
      (lvl(trip.dataQuality.overall.level) +
        lvl(trip.dataQuality.access.level)) /
        2,
      0.8
    );
  }

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return 0.5;
  return clamp(
    parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight,
    0,
    1
  );
}

/** User's risk comfort on a 0..1 scale (tolerance 1->0, 4->1). */
function userRiskComfort(prefs: TripPreferences): number {
  return (prefs.riskTolerance - 1) / 3;
}

// ---------------------------------------------------------------------------
// Sub-scorers — each returns points within its weight budget.
// ---------------------------------------------------------------------------

function scoreActivities(prefs: TripPreferences, trip: TripZone): number {
  const entries = Object.entries(prefs.selectedActivities) as [
    ActivityKey,
    TripPreferences["selectedActivities"][ActivityKey]
  ][];
  const selected = entries.filter(([, w]) => !!w);
  if (selected.length === 0) return SCORE_WEIGHTS.activityFit * 0.5;

  let weightSum = 0;
  let weighted = 0;
  let strongMustHaves = 0;
  for (const [key, weight] of selected) {
    if (!weight) continue;
    const mult = ACTIVITY_WEIGHT_MULTIPLIER[weight];
    const rating = trip.activities[key] ?? 0; // 0-5
    weighted += mult * (rating / 5);
    weightSum += mult;
    if (weight === "must_have" && rating >= 4) strongMustHaves += 1;
  }
  if (weightSum === 0) return SCORE_WEIGHTS.activityFit * 0.5;

  let fit = (weighted / weightSum) * SCORE_WEIGHTS.activityFit;
  // Reward trips that strongly satisfy multiple must-have activities.
  if (strongMustHaves >= 2) fit += 3;
  return clamp(fit, 0, SCORE_WEIGHTS.activityFit + 3);
}

function scoreDriveTime(prefs: TripPreferences, trip: TripZone): number {
  const max = effectiveMaxDrive(prefs.maxDriveTimeHours);
  const drive = getEffectiveDriveHours(prefs, trip);
  if (drive <= max) return SCORE_WEIGHTS.driveTimeFit;
  if (drive <= max + 1) return SCORE_WEIGHTS.driveTimeFit * 0.4;
  if (drive <= max + 2) return SCORE_WEIGHTS.driveTimeFit * 0.2;
  return 0;
}

function scoreSkill(prefs: TripPreferences, trip: TripZone): number {
  const diff = skillGap(prefs, trip); // + = trip harder than user
  const w = SCORE_WEIGHTS.skillFit;
  if (diff === 0) return w;
  if (diff === -1) return w * 0.85;
  if (diff <= -2) return w * 0.7; // overqualified — fine if activities match
  if (diff === 1) {
    // One level harder. A beginner can step up to an intermediate trip when
    // access is genuinely easy; otherwise it stays a meaningful stretch.
    const ra = trip.roadAccess;
    const easyAccess =
      !!ra && ra.accessRoadDifficulty <= 2 && !ra.fourWheelDriveRequired;
    return easyAccess && prefs.riskTolerance <= 2 ? w * 0.65 : w * 0.5;
  }
  return 0; // two+ harder
}

function scoreOffGrid(prefs: TripPreferences, trip: TripZone): number {
  const diff = Math.abs(trip.offGridLevel - prefs.offGridPreference);
  const w = SCORE_WEIGHTS.offGridFit;
  let score = diff === 0 ? w : diff === 1 ? w * 0.65 : diff === 2 ? w * 0.3 : w * 0.1;

  const lowRisk = prefs.riskTolerance <= 2;
  const highRisk = prefs.riskTolerance >= 3;
  const cell = trip.remoteness?.cellServiceLikelihood;
  const remote = trip.offGridLevel >= 3;

  // Low-risk users: dock remoteness that comes with poor cell service.
  if (lowRisk && remote && cell != null && cell <= 2) {
    score *= 0.7;
  }

  // High-risk users: only *reward* remoteness when they can actually handle it
  // (vehicle + skill in range and data confidence not low). Otherwise the
  // remoteness is a liability, not a perk.
  if (highRisk && remote) {
    const capable =
      vehicleGap(prefs, trip) <= 0 &&
      skillGap(prefs, trip) <= 0 &&
      !isOverallDataLow(trip);
    score = capable ? Math.min(w, score + w * 0.12) : score * 0.85;
  }

  return clamp(score, 0, w);
}

function userIdealCrowd(tolerance: number): number {
  // tolerance 1 (don't mind) -> tolerant of crowd 5; 4 (avoid) -> wants ~1.5
  return [5, 3.5, 2.5, 1.5][tolerance - 1] ?? 3;
}

function scoreCrowd(prefs: TripPreferences, trip: TripZone): number {
  const ideal = userIdealCrowd(prefs.crowdTolerance);
  const over = Math.max(0, trip.crowdLevel - ideal);
  return SCORE_WEIGHTS.crowdFit * clamp(1 - over / 4, 0, 1);
}

function scoreVehicle(prefs: TripPreferences, trip: TripZone): number {
  const userRank = userVehicleRank(prefs.vehicleCapability);
  const gap = vehicleGap(prefs, trip); // + = trip needs more capability
  const w = SCORE_WEIGHTS.vehicleFit;
  let score = gap <= 0 ? w : gap === 1 ? w * 0.4 : 0;

  // Road-access modifiers (independent of the coarse vehicle rank, and kept
  // separate from OHV legality, which is about *riding*, not *access*).
  const ra = trip.roadAccess;
  if (ra) {
    // Needs real 4WD but the user is below truck capability.
    if (ra.fourWheelDriveRequired && userRank < VEHICLE_RANK.truck) {
      score = Math.min(score, w * 0.2);
    }
    // Genuinely rough road and the user is in a car/SUV — penalize heavily.
    if (ra.accessRoadDifficulty >= 4 && userRank <= VEHICLE_RANK.suv) {
      score = Math.min(score, w * 0.15);
    }
  }

  return clamp(score, 0, w);
}

function scoreCamping(prefs: TripPreferences, trip: TripZone): number {
  const w = SCORE_WEIGHTS.campingFit;
  const pref = prefs.campingPreference;
  if (pref === "none") return w; // camping availability is irrelevant
  if (pref === "either")
    return trip.campingTypes.length > 0 ? w : w * 0.5;
  return trip.campingTypes.includes(pref) ? w : w * 0.33;
}

function normalizeVibe(v: string): string {
  return v.toLowerCase().replace(/[^a-z]/g, "");
}

function scoreVibe(prefs: TripPreferences, trip: TripZone): number {
  const w = SCORE_WEIGHTS.vibeFit;
  if (prefs.vibes.length === 0) return w * 0.6;
  const tripVibes = trip.vibes.map(normalizeVibe);
  let matches = 0;
  for (const v of prefs.vibes) {
    const nv = normalizeVibe(v);
    if (
      tripVibes.some(
        (tv) => tv === nv || tv.includes(nv) || nv.includes(tv)
      )
    ) {
      matches += 1;
    }
  }
  return w * clamp(matches / prefs.vibes.length, 0, 1);
}

function scoreGear(prefs: TripPreferences, trip: TripZone): number {
  const w = SCORE_WEIGHTS.gearFit;
  const gear = new Set(prefs.gear);
  // Map relevant gear to trip suitability. Only count gear that matters here.
  const relevant: Array<{ needed: boolean; have: boolean }> = [];
  const push = (needed: boolean, item: string) =>
    needed && relevant.push({ needed, have: gear.has(item) });

  push(trip.activities.dirtBikingOhv >= 4, "Dirt bike");
  push(trip.activities.fishing >= 4, "Fishing gear");
  push(
    (trip.activities.kayaking ?? 0) >= 4 || (trip.activities.canoeing ?? 0) >= 4,
    "Kayak / canoe"
  );
  push((trip.activities.motorBoating ?? 0) >= 4, "Motorboat");
  push((trip.activities.lakeAccess ?? 0) >= 4, "Paddleboard");
  push(trip.activities.backpacking >= 4, "Backpacking gear");
  push(trip.offGridLevel >= 3, "Satellite communicator");
  push(
    trip.vehicleRequirement === "high_clearance_4x4" ||
      trip.vehicleRequirement === "ohv",
    "4x4 vehicle"
  );
  push(trip.activities.winterAccess >= 4, "Winter gear");

  if (relevant.length === 0) return w * 0.6; // nothing special needed
  const satisfied = relevant.filter((r) => r.have).length;
  return w * clamp(satisfied / relevant.length, 0, 1);
}

function scoreSeason(prefs: TripPreferences, trip: TripZone): number {
  const w = SCORE_WEIGHTS.seasonFit;
  const season = inferSeason(prefs.startDate);
  if (!season) return w * 0.6; // no date given -> neutral
  return trip.bestSeasons.includes(season) ? w : w * 0.25;
}

/**
 * Risk fit: how well the trip's overall riskiness lines up with the user's
 * risk tolerance.
 *  - Within comfort (trip risk <= tolerance): full credit, with only a small
 *    dock if a trip is far *below* what a high-adventure user wanted.
 *  - Above comfort (trip riskier than tolerance): scaled down by the overshoot.
 *  - For high-risk users, remote/rough trips only earn full credit when the
 *    user can actually handle them (vehicle + skill in range); a capability
 *    mismatch means the "adventure" isn't a good fit.
 */
function scoreRiskFit(prefs: TripPreferences, trip: TripZone): number {
  const w = SCORE_WEIGHTS.riskFit;
  const risk = tripRiskIndex(prefs, trip);
  const comfort = userRiskComfort(prefs);
  const diff = risk - comfort; // + = trip riskier than the user wants

  let fraction: number;
  if (diff <= 0) {
    // Within comfort. Mild dock if a thrill-seeker drew a very tame trip.
    fraction = 1 - 0.15 * Math.min(1, -diff);
  } else {
    // Over comfort: each unit of overshoot bites hard.
    fraction = clamp(1 - diff * 1.6, 0, 1);
  }

  // High-adventure users shouldn't get full risk credit for trips they can't
  // safely take on (under-vehicled / under-skilled).
  if (prefs.riskTolerance >= 3) {
    const mismatch = Math.max(
      0,
      vehicleGap(prefs, trip),
      skillGap(prefs, trip)
    );
    if (mismatch >= 1) fraction = Math.min(fraction, mismatch >= 2 ? 0.35 : 0.6);
  }

  return clamp(w * fraction, 0, w);
}

/**
 * Extra safety guardrail: a visible deduction (separate from `penalties`) when
 * a lower-risk user (tolerance 1-2) is matched with a trip carrying concrete
 * hazards. Kept modest and capped so it nudges ranking toward safer trips
 * without burying every adventurous option.
 */
function computeRiskPenalty(prefs: TripPreferences, trip: TripZone): number {
  if (prefs.riskTolerance >= 3) return 0; // adventurous users opted in

  const low = prefs.riskTolerance === 1;
  let penalty = 0;

  // Winter access risk on a winter trip.
  const ra = trip.roadAccess;
  if (ra && isWinterContext(prefs) && ra.winterAccessRisk >= 4) {
    penalty -= low ? 6 : 3;
  }

  // Weak cell service in a remote zone.
  const cell = trip.remoteness?.cellServiceLikelihood;
  if (cell != null && cell <= 2 && trip.offGridLevel >= 3) {
    penalty -= low ? 5 : 2;
  }

  // Legality uncertainty the user can't easily resolve.
  if (trip.legality?.ohvLegal === "unknown") penalty -= low ? 4 : 2;

  // Deep backcountry for someone who wanted easy access.
  if (low && trip.offGridLevel >= 3) penalty -= 3;

  return Math.max(-15, penalty);
}

// ---------------------------------------------------------------------------
// Must-avoid conflict detection
// ---------------------------------------------------------------------------

/** Returns the list of user must-avoid items this trip conflicts with. */
export function getAvoidConflicts(
  prefs: TripPreferences,
  trip: TripZone
): string[] {
  const flags = new Set(trip.avoidFlags);
  const conflicts: string[] = [];
  const has = (s: string) => flags.has(s);

  for (const item of prefs.mustAvoid) {
    switch (item) {
      case "Long rough roads":
        if (
          has(item) ||
          trip.vehicleRequirement === "high_clearance_4x4" ||
          trip.vehicleRequirement === "ohv"
        )
          conflicts.push(item);
        break;
      case "Snow access":
        if (has(item) || (trip.bestSeasons.includes("winter") && trip.activities.winterAccess >= 3))
          conflicts.push(item);
        break;
      case "Extreme heat":
        if (has(item)) conflicts.push(item);
        break;
      case "Crowds":
        if (has(item) || trip.crowdLevel >= 4) conflicts.push(item);
        break;
      case "Permit-heavy areas":
        if (has(item)) conflicts.push(item);
        break;
      case "Advanced trails":
        if (trip.skillLevel === "advanced" || trip.skillLevel === "expert")
          conflicts.push(item);
        break;
      case "Water crossings":
        if (has(item)) conflicts.push(item);
        break;
      case "No cell service":
        if (has(item) || trip.offGridLevel >= 3) conflicts.push(item);
        break;
      case "Fire restriction zones":
        if (has(item)) conflicts.push(item);
        break;
      case "Wildlife-heavy areas":
        if (has(item) || trip.activities.wildlife >= 4) conflicts.push(item);
        break;
      case "Long hikes":
        if (has(item) || trip.activities.backpacking >= 4) conflicts.push(item);
        break;
      default:
        if (has(item)) conflicts.push(item);
    }
  }
  return conflicts;
}

/** Must-have activities the trip fails to deliver (rating 0 or 1). */
export function getMissingMustHaves(
  prefs: TripPreferences,
  trip: TripZone
): ActivityKey[] {
  const missing: ActivityKey[] = [];
  for (const [key, weight] of Object.entries(prefs.selectedActivities) as [
    ActivityKey,
    string
  ][]) {
    if (weight === "must_have" && (trip.activities[key] ?? 0) <= 1) {
      missing.push(key);
    }
  }
  return missing;
}

/**
 * Must-have activities that are present-but-weak (rating exactly 2). These are
 * meaningfully under-delivered without being fully "missing" (<= 1), so they
 * earn a moderate penalty rather than the full missing-must-have hit.
 */
export function getWeakMustHaves(
  prefs: TripPreferences,
  trip: TripZone
): ActivityKey[] {
  const weak: ActivityKey[] = [];
  for (const [key, weight] of Object.entries(prefs.selectedActivities) as [
    ActivityKey,
    string
  ][]) {
    if (weight === "must_have" && (trip.activities[key] ?? 0) === 2) {
      weak.push(key);
    }
  }
  return weak;
}

/** Must-have activities the trip strongly satisfies (rating 4 or 5). */
export function getStrongMustHaves(
  prefs: TripPreferences,
  trip: TripZone
): ActivityKey[] {
  const strong: ActivityKey[] = [];
  for (const [key, weight] of Object.entries(prefs.selectedActivities) as [
    ActivityKey,
    string
  ][]) {
    if (weight === "must_have" && (trip.activities[key] ?? 0) >= 4) {
      strong.push(key);
    }
  }
  return strong;
}

// ---------------------------------------------------------------------------
// Penalties + hidden-gem boost
// ---------------------------------------------------------------------------

/** Points lost for `count` missing must-have activities, capped. */
export function missingMustHavePenalty(count: number): number {
  const { perActivity, cap } = MISSING_MUST_HAVE_PENALTY;
  return Math.min(cap, count * perActivity);
}

function computePenalties(prefs: TripPreferences, trip: TripZone): number {
  let penalty = 0;

  // Must-avoid conflicts: -15 each, capped at -40.
  const conflicts = getAvoidConflicts(prefs, trip);
  if (conflicts.length > 0) {
    penalty -= Math.min(40, conflicts.length * 15);
  }

  // Missing must-have activities (rating <= 1).
  const missing = getMissingMustHaves(prefs, trip);
  penalty -= missingMustHavePenalty(missing.length);

  // Present-but-weak must-haves (rating 2): -8 each.
  const weak = getWeakMustHaves(prefs, trip);
  if (weak.length > 0) {
    penalty -= weak.length * 8;
  }

  // Multiple under-delivered must-haves (missing + weak) compound: extra -8.
  if (missing.length + weak.length >= 2) {
    penalty -= 8;
  }

  // Rough access vs. an under-capable vehicle. This stacks intentionally with
  // the reduced vehicle sub-score to make genuinely hard access "heavy".
  const ra = trip.roadAccess;
  const userVRank = userVehicleRank(prefs.vehicleCapability);
  if (ra) {
    if (ra.accessRoadDifficulty >= 4 && userVRank <= VEHICLE_RANK.suv) {
      penalty -= 10;
    }
    if (
      ra.fourWheelDriveRequired &&
      userVRank < VEHICLE_RANK.truck &&
      ra.accessRoadDifficulty < 4
    ) {
      // Avoid double-dipping with the rough-road penalty above.
      penalty -= 8;
    }
  }

  // Drive slightly over max.
  const max = effectiveMaxDrive(prefs.maxDriveTimeHours);
  const drive = getEffectiveDriveHours(prefs, trip);
  if (drive > max && drive <= max + 2) {
    penalty -= drive <= max + 1 ? 12 : 18;
  }

  // Skill: one level harder than the user — possible but penalized.
  const skillDiff = SKILL_RANK[trip.skillLevel] - SKILL_RANK[prefs.experienceLevel];
  if (skillDiff === 1) penalty -= 8;

  // Vehicle: one rank short of trip requirement.
  const vGap =
    VEHICLE_RANK[trip.vehicleRequirement] - userVehicleRank(prefs.vehicleCapability);
  if (vGap === 1) penalty -= 10;

  // High crowd when the user wants quiet.
  if (prefs.crowdTolerance >= 3 && trip.crowdLevel >= 4) {
    penalty -= prefs.crowdTolerance === 4 ? 14 : 9;
  }

  // Data quality. Penalize low confidence so well-verified zones rank above
  // shakier ones, weighting legality (permits/fire/OHV legality) most heavily
  // since getting that wrong has real consequences. Categories are distinct,
  // so the small stack here is intentional, not double-counting.
  penalty += dataQualityPenalty(trip);

  return penalty;
}

/**
 * Confidence-based penalty drawn from the structured data-quality model.
 * Medium confidence is only lightly docked; low confidence — especially on
 * legality — is docked more. Falls back to the legacy `dataConfidence` field
 * if a zone somehow lacks the structured object.
 */
function dataQualityPenalty(trip: TripZone): number {
  const dq = trip.dataQuality;
  if (!dq) {
    if (trip.dataConfidence === "low") return -6;
    if (trip.dataConfidence === "medium") return -2;
    return 0;
  }

  let p = 0;
  if (dq.overall.level === "low") p -= 6;
  else if (dq.overall.level === "medium") p -= 2;

  if (dq.legality.level === "low") p -= 8;
  else if (dq.legality.level === "medium") p -= 3;

  if (dq.access.level === "low") p -= 5;

  return p;
}

function computeHiddenGemBoost(prefs: TripPreferences, trip: TripZone): number {
  const quietPref = prefs.crowdTolerance >= 3;
  const remotePref = prefs.offGridPreference >= 3;
  const adventurousVibe = prefs.vibes.some((v) =>
    ["Remote and quiet", "Rugged and adventurous"].includes(v)
  );
  const eligible = quietPref || remotePref || adventurousVibe;

  // --- Positive discovery boost ---
  const gem = trip.hiddenGemScore;
  let gemBoost = 0;
  if (eligible) {
    if (gem === 5) gemBoost = 9;
    else if (gem === 4) gemBoost = 6;
    else if (gem === 3) gemBoost = 3;
  } else {
    if (gem === 5) gemBoost = 3;
    else if (gem === 4) gemBoost = 2;
  }

  // A hidden gem is no bargain if you can't safely get there or handle it.
  // Don't let discovery value paper over a severe vehicle or skill mismatch.
  if (vehicleGap(prefs, trip) >= 2 || skillGap(prefs, trip) >= 2) {
    gemBoost = 0;
  }

  // Bound the boost by data and legality confidence — we shouldn't hype a
  // poorly-verified "gem".
  if (trip.dataQuality) {
    if (trip.dataQuality.overall.level === "low") gemBoost *= 0.4;
    else if (trip.dataQuality.overall.level === "medium") gemBoost *= 0.85;
    if (trip.dataQuality.legality.level === "low") gemBoost *= 0.6;
  } else if (trip.dataConfidence === "low") {
    gemBoost *= 0.4;
  }

  // --- Popularity dampening (when the user wants quiet / off-grid) ---
  let popAdj = 0;
  if (quietPref || remotePref) {
    const pop = trip.popularityScore;
    const hard = prefs.crowdTolerance === 4; // strongest crowd aversion
    if (pop === 5) popAdj = hard ? -14 : -10;
    else if (pop === 4) popAdj = hard ? -8 : -5;
    else if (pop <= 2) popAdj = 2;
  }

  return Math.round((gemBoost + popAdj) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function calculateTripScore(
  prefs: TripPreferences,
  trip: TripZone
): ScoreBreakdown {
  const activityFit = scoreActivities(prefs, trip);
  const driveTimeFit = scoreDriveTime(prefs, trip);
  const skillFit = scoreSkill(prefs, trip);
  const offGridFit = scoreOffGrid(prefs, trip);
  const crowdFit = scoreCrowd(prefs, trip);
  const vehicleFit = scoreVehicle(prefs, trip);
  const campingFit = scoreCamping(prefs, trip);
  const vibeFit = scoreVibe(prefs, trip);
  const gearFit = scoreGear(prefs, trip);
  const seasonFit = scoreSeason(prefs, trip);
  const riskFit = scoreRiskFit(prefs, trip);
  const penalties = computePenalties(prefs, trip);
  const riskPenalty = computeRiskPenalty(prefs, trip);
  const hiddenGemBoost = computeHiddenGemBoost(prefs, trip);

  const base =
    activityFit +
    driveTimeFit +
    skillFit +
    offGridFit +
    crowdFit +
    vehicleFit +
    campingFit +
    vibeFit +
    gearFit +
    seasonFit +
    riskFit;

  const finalScore = clamp(
    Math.round(base + penalties + riskPenalty + hiddenGemBoost),
    0,
    100
  );

  return {
    activityFit: Math.round(activityFit * 10) / 10,
    driveTimeFit: Math.round(driveTimeFit * 10) / 10,
    skillFit: Math.round(skillFit * 10) / 10,
    offGridFit: Math.round(offGridFit * 10) / 10,
    crowdFit: Math.round(crowdFit * 10) / 10,
    vehicleFit: Math.round(vehicleFit * 10) / 10,
    campingFit: Math.round(campingFit * 10) / 10,
    vibeFit: Math.round(vibeFit * 10) / 10,
    gearFit: Math.round(gearFit * 10) / 10,
    seasonFit: Math.round(seasonFit * 10) / 10,
    riskFit: Math.round(riskFit * 10) / 10,
    penalties,
    riskPenalty,
    hiddenGemBoost,
    finalScore,
  };
}

export function getQualityLabel(score: number): string {
  if (score >= 90) return "Excellent match";
  if (score >= 80) return "Strong match";
  if (score >= 70) return "Good match";
  if (score >= 60) return "Possible match";
  return "Weak match";
}

/**
 * Hard constraints that should remove a trip from normal recommendations
 * entirely (vs. a soft point penalty).
 */
export function hasHardConstraintViolation(
  prefs: TripPreferences,
  trip: TripZone
): boolean {
  // Drive time far above the user's max.
  const max = effectiveMaxDrive(prefs.maxDriveTimeHours);
  if (getEffectiveDriveHours(prefs, trip) > max + 2) return true;

  // Beginner (or otherwise under-skilled) user vs. much harder trip.
  const userRank = SKILL_RANK[prefs.experienceLevel];
  if (SKILL_RANK[trip.minRecommendedSkill] - userRank >= 2) return true;
  if (SKILL_RANK[trip.skillLevel] - userRank >= 2) return true;

  // Severe vehicle mismatch (two+ capability ranks short).
  const userVRank = userVehicleRank(prefs.vehicleCapability);
  if (vehicleGap(prefs, trip) >= 2) return true;

  // Road-access guardrails for everyone: extreme roads simply aren't reachable
  // without the right rig, regardless of how the coarse vehicle rank reads.
  const ra = trip.roadAccess;
  if (ra) {
    if (
      ra.accessRoadDifficulty >= 5 &&
      userVRank < VEHICLE_RANK.high_clearance_4x4
    )
      return true;
    if (ra.fourWheelDriveRequired && userVRank < VEHICLE_RANK.truck) return true;
  }

  // Risk guardrails for genuinely low-risk users ("easy access"). We only hard
  // block when a trip is extreme on *multiple* dimensions — not merely because
  // it's adventurous.
  if (prefs.riskTolerance === 1) {
    // Deep backcountry that is also advanced/expert terrain.
    if (
      trip.offGridLevel === 4 &&
      (trip.skillLevel === "advanced" || trip.skillLevel === "expert")
    )
      return true;

    // A must-have activity whose legality is genuinely unknown for a low-risk
    // user — don't send them somewhere the activity may not even be allowed.
    if (
      trip.legality?.ohvLegal === "unknown" &&
      prefs.selectedActivities.dirtBikingOhv === "must_have"
    )
      return true;
  }

  // Season hard constraint: if a date is given and the zone's best seasons
  // don't include the trip's season, eliminate the zone entirely.
  const tripSeason = inferSeason(prefs.startDate);
  if (tripSeason && trip.bestSeasons.length > 0) {
    if (!trip.bestSeasons.includes(tripSeason)) return true;
  }

  // OHV must-have + OHV explicitly illegal in this zone = hard fail.
  if (
    prefs.selectedActivities.dirtBikingOhv === "must_have" &&
    trip.legality?.ohvLegal === "no"
  ) {
    return true;
  }

  return false;
}

/**
 * Concrete, punchy risk concerns for a trip given the user's inputs. Used in
 * explanations so the "why it might not" list names real hazards.
 */
export function getRiskConcerns(
  prefs: TripPreferences,
  trip: TripZone
): string[] {
  const out: string[] = [];
  const ra = trip.roadAccess;
  const rm = trip.remoteness;

  if (vehicleGap(prefs, trip) >= 1 || (ra && ra.fourWheelDriveRequired))
    out.push(
      `Vehicle stretch — needs ${VEHICLE_LABELS[trip.vehicleRequirement]}.`
    );
  if (ra && ra.accessRoadDifficulty >= 4)
    out.push(`Rough access road (${ra.accessRoadDifficulty}/5).`);
  if (ra && isWinterContext(prefs) && ra.winterAccessRisk >= 4)
    out.push(`Winter access can close (risk ${ra.winterAccessRisk}/5).`);
  if (rm && rm.cellServiceLikelihood <= 2)
    out.push(`Little cell service (${rm.cellServiceLikelihood}/5).`);
  if (trip.offGridLevel >= 3 && prefs.riskTolerance <= 2)
    out.push("More off-grid than your easy-access preference.");
  if (trip.legality?.permitLikelyRequired)
    out.push("A permit is likely required — verify first.");
  if (
    trip.legality &&
    (trip.legality.ohvLegal === "unknown" ||
      trip.legality.ohvLegal === "area_specific") &&
    !!prefs.selectedActivities.dirtBikingOhv
  )
    out.push("OHV legality is area-specific here — confirm legal routes.");

  return out;
}

export function explainMatch(
  prefs: TripPreferences,
  trip: TripZone,
  breakdown: ScoreBreakdown
): { whyItMatches: string[]; whyItMightNot: string[] } {
  const whyItMatches: string[] = [];
  const whyItMightNot: string[] = [];

  // --- Positives ---
  const strongActivities = (
    Object.entries(prefs.selectedActivities) as [ActivityKey, string][]
  )
    .filter(([key, w]) => w && (trip.activities[key] ?? 0) >= 4)
    .map(([key]) => ACTIVITY_LABELS[key]);
  if (strongActivities.length > 0) {
    whyItMatches.push(
      `Strong for your activities: ${strongActivities.slice(0, 4).join(", ")}.`
    );
  }

  const strongMust = getStrongMustHaves(prefs, trip);
  if (strongMust.length >= 2) {
    whyItMatches.push(
      `Nails ${strongMust.length} must-haves: ${strongMust
        .map((m) => ACTIVITY_LABELS[m])
        .join(", ")}.`
    );
  }

  const originLabel = resolveOrigin(prefs.startingLocation).label;
  const driveHrs = getEffectiveDriveHours(prefs, trip);
  if (breakdown.driveTimeFit >= SCORE_WEIGHTS.driveTimeFit) {
    whyItMatches.push(
      `Within your drive window (~${driveHrs} hrs from ${originLabel}).`
    );
  }

  const skillDiff =
    SKILL_RANK[trip.skillLevel] - SKILL_RANK[prefs.experienceLevel];
  if (skillDiff === 0)
    whyItMatches.push(`Skill level matches you exactly (${trip.skillLevel}).`);
  else if (skillDiff === -1)
    whyItMatches.push("Slightly easier than your level — comfortable.");

  if (Math.abs(trip.offGridLevel - prefs.offGridPreference) <= 1)
    whyItMatches.push("Remoteness fits the off-grid feel you asked for.");

  if ((prefs.crowdTolerance >= 3 || prefs.offGridPreference >= 3) && trip.hiddenGemScore >= 4)
    whyItMatches.push(
      `Hidden gem (gem score ${trip.hiddenGemScore}/5) — less obvious than the headliners.`
    );

  const vehicleOk =
    VEHICLE_RANK[trip.vehicleRequirement] <=
    userVehicleRank(prefs.vehicleCapability);
  if (vehicleOk)
    whyItMatches.push(
      `Reachable with your vehicle (needs ${VEHICLE_LABELS[trip.vehicleRequirement]}).`
    );
  if (prefs.vehicleCapability === "not_sure" && vehicleOk)
    whyItMatches.push("Access looks easy enough even if you're unsure on vehicle.");

  // Risk fit.
  const riskLabel = RISK_LABELS[prefs.riskTolerance];
  if (breakdown.riskFit >= SCORE_WEIGHTS.riskFit * 0.8)
    whyItMatches.push(`Risk level fits your ${riskLabel} preference.`);
  if (
    prefs.riskTolerance >= 3 &&
    trip.offGridLevel >= 3 &&
    vehicleGap(prefs, trip) <= 0 &&
    skillGap(prefs, trip) <= 0
  )
    whyItMatches.push("Remote and rugged — and within your vehicle & skill range.");

  // Hidden-gem boost explanation.
  if (breakdown.hiddenGemBoost > 0 && trip.hiddenGemScore >= 4)
    whyItMatches.push(
      `Hidden-gem boost applied (gem ${trip.hiddenGemScore}/5, popularity ${trip.popularityScore}/5).`
    );

  if (
    prefs.campingPreference !== "none" &&
    prefs.campingPreference !== "either" &&
    trip.campingTypes.includes(prefs.campingPreference)
  ) {
    whyItMatches.push(
      `Offers your camping style (${CAMPING_LABELS[prefs.campingPreference]}).`
    );
  }

  // --- Negatives ---
  const conflicts = getAvoidConflicts(prefs, trip);
  if (conflicts.length > 0)
    whyItMightNot.push(`Overlaps things you wanted to avoid: ${conflicts.join(", ")}.`);

  const missing = getMissingMustHaves(prefs, trip);
  if (missing.length > 0)
    whyItMightNot.push(
      `Weak on a must-have activity: ${missing.map((m) => ACTIVITY_LABELS[m]).join(", ")}.`
    );

  if (skillDiff === 1)
    whyItMightNot.push("A notch harder than your stated level — plan accordingly.");
  else if (skillDiff >= 2)
    whyItMightNot.push("Significantly harder than your experience level.");
  else if (skillDiff <= -2)
    whyItMightNot.push("Likely to feel easy for your level.");

  const max = effectiveMaxDrive(prefs.maxDriveTimeHours);
  if (driveHrs > max)
    whyItMightNot.push(`Longer drive than your max (~${driveHrs} hrs).`);

  if (prefs.crowdTolerance >= 3 && trip.crowdLevel >= 4)
    whyItMightNot.push("Can get crowded — counter to your preference for quiet.");

  // Popularity dampening reason.
  if (
    (prefs.crowdTolerance >= 3 || prefs.offGridPreference >= 3) &&
    trip.popularityScore >= 4
  )
    whyItMightNot.push(
      `Busy headliner (popularity ${trip.popularityScore}/5) — dampened since you want quiet.`
    );

  // Risk fit + concrete risk concerns. Lead with the headline, then name the
  // top couple of specifics so the list stays punchy.
  if (breakdown.riskFit <= SCORE_WEIGHTS.riskFit * 0.4)
    whyItMightNot.push(`Riskier than your ${riskLabel} comfort.`);
  for (const c of getRiskConcerns(prefs, trip).slice(0, 4))
    whyItMightNot.push(c);

  const overallLevel = trip.dataQuality?.overall.level ?? trip.dataConfidence;
  if (overallLevel !== "high")
    whyItMightNot.push(
      `Data confidence is ${overallLevel} — verify details before you commit.`
    );
  if (trip.dataQuality && trip.dataQuality.legality.level === "low")
    whyItMightNot.push(
      "Rules (permits, fire, OHV) are low-confidence here — confirm with the land manager."
    );

  if (whyItMatches.length === 0)
    whyItMatches.push("A reasonable all-around fit for your inputs.");

  return { whyItMatches, whyItMightNot };
}
