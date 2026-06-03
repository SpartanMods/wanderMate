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
  const userRank = SKILL_RANK[prefs.experienceLevel];
  const tripRank = SKILL_RANK[trip.skillLevel];
  const diff = tripRank - userRank; // + = trip harder than user
  const w = SCORE_WEIGHTS.skillFit;
  if (diff === 0) return w;
  if (diff === -1) return w * 0.85;
  if (diff <= -2) return w * 0.6; // overqualified / too easy
  if (diff === 1) return w * 0.5; // one level harder, possible
  return 0; // two+ harder
}

function scoreOffGrid(prefs: TripPreferences, trip: TripZone): number {
  const diff = Math.abs(trip.offGridLevel - prefs.offGridPreference);
  const w = SCORE_WEIGHTS.offGridFit;
  if (diff === 0) return w;
  if (diff === 1) return w * 0.65;
  if (diff === 2) return w * 0.3;
  return w * 0.1;
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
  const tripRank = VEHICLE_RANK[trip.vehicleRequirement];
  const gap = tripRank - userRank; // + = trip needs more capability
  const w = SCORE_WEIGHTS.vehicleFit;
  if (gap <= 0) {
    // Capable enough. Slightly dock heavy rigs on very easy trips? Keep full.
    return w;
  }
  if (gap === 1) return w * 0.4;
  return 0;
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
  push(trip.activities.lakePaddle >= 4, "Paddleboard / kayak");
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

// ---------------------------------------------------------------------------
// Penalties + hidden-gem boost
// ---------------------------------------------------------------------------

function computePenalties(prefs: TripPreferences, trip: TripZone): number {
  let penalty = 0;

  // Must-avoid conflicts: -15 each, capped at -40.
  const conflicts = getAvoidConflicts(prefs, trip);
  if (conflicts.length > 0) {
    penalty -= Math.min(40, conflicts.length * 15);
  }

  // Missing must-have activities: -20 each, capped at -45.
  const missing = getMissingMustHaves(prefs, trip);
  if (missing.length > 0) {
    penalty -= Math.min(45, missing.length * 20);
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

  let boost = 0;
  const gem = trip.hiddenGemScore;
  if (eligible) {
    if (gem === 5) boost += 9;
    else if (gem === 4) boost += 6;
    else if (gem === 3) boost += 3;
  } else {
    // Mild discovery value even for crowd-tolerant users.
    if (gem === 5) boost += 3;
    else if (gem === 4) boost += 2;
  }

  // Popularity dampening when the user wants quiet / off-grid.
  if (quietPref || remotePref) {
    const pop = trip.popularityScore;
    if (pop === 5) boost -= 10;
    else if (pop === 4) boost -= 5;
    else if (pop <= 2) boost += 2;
  }

  return boost;
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
  const penalties = computePenalties(prefs, trip);
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
    seasonFit;

  const finalScore = clamp(
    Math.round(base + penalties + hiddenGemBoost),
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
    penalties,
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
  const vGap =
    VEHICLE_RANK[trip.vehicleRequirement] - userVehicleRank(prefs.vehicleCapability);
  if (vGap >= 2) return true;

  return false;
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

  const max = effectiveMaxDrive(prefs.maxDriveTimeHours);
  if (driveHrs > max)
    whyItMightNot.push(`Longer drive than your max (~${driveHrs} hrs).`);

  const vGap =
    VEHICLE_RANK[trip.vehicleRequirement] -
    userVehicleRank(prefs.vehicleCapability);
  if (vGap >= 1)
    whyItMightNot.push(
      `Access may exceed your vehicle (needs ${VEHICLE_LABELS[trip.vehicleRequirement]}).`
    );

  if (prefs.crowdTolerance >= 3 && trip.crowdLevel >= 4)
    whyItMightNot.push("Can get crowded — counter to your preference for quiet.");

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
