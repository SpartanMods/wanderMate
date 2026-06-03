/*
 * Recommendation pipeline: scores every trip, filters hard-constraint
 * violations, ranks by score, and diversifies the top set by region so the
 * list doesn't read as five flavors of the same destination.
 */

import {
  calculateTripScore,
  explainMatch,
  getQualityLabel,
  hasHardConstraintViolation,
} from "./scoring";
import type { TripPreferences, TripRecommendation, TripZone } from "./types";

function buildRecommendation(
  prefs: TripPreferences,
  trip: TripZone
): TripRecommendation {
  const breakdown = calculateTripScore(prefs, trip);
  const { whyItMatches, whyItMightNot } = explainMatch(prefs, trip, breakdown);
  return {
    trip,
    score: breakdown.finalScore,
    qualityLabel: getQualityLabel(breakdown.finalScore),
    breakdown,
    whyItMatches,
    whyItMightNot,
  };
}

/**
 * Reduce ranking priority for repeated regions/states so the top results
 * span a range of zones. Displayed scores are untouched; only ordering moves.
 */
export function diversifyRecommendations(
  recommendations: TripRecommendation[]
): TripRecommendation[] {
  const counts: Record<string, number> = {};
  const keyed = recommendations.map((rec) => {
    const region = rec.trip.region || rec.trip.state;
    const seen = counts[region] ?? 0;
    counts[region] = seen + 1;
    // Small reduction per prior trip from the same region.
    const adjusted = rec.score - seen * 5;
    return { rec, adjusted };
  });

  keyed.sort((a, b) => b.adjusted - a.adjusted);
  return keyed.map((k) => k.rec);
}

/**
 * Primary entry point: ranked, diversified recommendations with hard
 * violations removed.
 */
export function getRecommendations(
  preferences: TripPreferences,
  trips: TripZone[]
): TripRecommendation[] {
  const scored = trips
    .filter((trip) => !hasHardConstraintViolation(preferences, trip))
    .map((trip) => buildRecommendation(preferences, trip))
    .sort((a, b) => b.score - a.score);

  return diversifyRecommendations(scored);
}

/**
 * Closest matches IGNORING hard constraints — used to populate the empty
 * state so the user always sees something, with warnings attached.
 */
export function getClosestMatches(
  preferences: TripPreferences,
  trips: TripZone[],
  limit = 3
): TripRecommendation[] {
  return trips
    .map((trip) => buildRecommendation(preferences, trip))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Diagnose which constraints are likely too restrictive, to coach the user
 * in the empty state.
 */
export function diagnoseRestrictiveness(
  preferences: TripPreferences,
  trips: TripZone[]
): string[] {
  const reasons: string[] = [];
  const max = preferences.maxDriveTimeHours >= 6 ? 99 : preferences.maxDriveTimeHours;

  const withinDrive = trips.filter(
    (t) => t.driveTimeFromDenverHours <= max + 2
  ).length;
  if (withinDrive < 4)
    reasons.push("Your max drive time is filtering out most zones — try adding an hour or two.");

  if (preferences.vehicleCapability === "any_car")
    reasons.push("“Any car” excludes high-clearance and OHV zones — many backcountry areas need more capability.");

  if (preferences.experienceLevel === "beginner")
    reasons.push("Beginner level removes advanced/expert zones — that's intentional for safety, but it narrows options.");

  if (preferences.mustAvoid.length >= 4)
    reasons.push("You have several must-avoid filters — relaxing one or two will open up matches.");

  if (preferences.offGridPreference === 4)
    reasons.push("“Deep backcountry” is a narrow band — consider “Properly off-grid” for more results.");

  const mustHaves = Object.values(preferences.selectedActivities).filter(
    (w) => w === "must_have"
  ).length;
  if (mustHaves >= 3)
    reasons.push("Several must-have activities are hard to satisfy at once — try marking some as “Important” instead.");

  if (reasons.length === 0)
    reasons.push("Try widening your drive time, vehicle capability, or off-grid level.");

  return reasons;
}
