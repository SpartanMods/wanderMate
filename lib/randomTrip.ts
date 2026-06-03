/*
 * "Surprise Me" engine. Weighted-random, not pure-random: it scores every
 * trip, drops hard mismatches and weak fits, then samples using a blend of
 * match score, hidden-gem value, low popularity, and region novelty so the
 * pick is surprising but still relevant.
 */

import {
  calculateTripScore,
  explainMatch,
  getQualityLabel,
  hasHardConstraintViolation,
} from "./scoring";
import type { TripPreferences, TripRecommendation, TripZone } from "./types";
import { mulberry32 } from "./utils";

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
 * Selection weight blends:
 *   - match score        50%
 *   - hidden-gem score   25%
 *   - lower popularity   15%
 *   - region novelty     10%
 */
function selectionWeight(
  rec: TripRecommendation,
  usedRegions: Set<string>
): number {
  const matchComponent = (rec.score / 100) * 0.5;
  const gemComponent = (rec.trip.hiddenGemScore / 5) * 0.25;
  const popComponent = ((6 - rec.trip.popularityScore) / 5) * 0.15;
  const novelty = usedRegions.has(rec.trip.region) ? 0 : 0.1;
  // Keep strictly positive so every eligible trip has a chance.
  return Math.max(0.01, matchComponent + gemComponent + popComponent + novelty);
}

function weightedPick(
  pool: TripRecommendation[],
  usedRegions: Set<string>,
  rand: () => number
): TripRecommendation {
  const weights = pool.map((rec) => selectionWeight(rec, usedRegions));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function getRandomTripRecommendation(
  preferences: TripPreferences,
  trips: TripZone[]
): {
  primary: TripRecommendation;
  backups: TripRecommendation[];
  explanation: string;
} {
  // 1-2. Score everything, drop hard violations.
  const eligible = trips
    .filter((trip) => !hasHardConstraintViolation(preferences, trip))
    .map((trip) => buildRecommendation(preferences, trip));

  // 3-4. Keep score >= 70, relax to >= 60 if too few remain.
  let pool = eligible.filter((r) => r.score >= 70);
  if (pool.length < 3) pool = eligible.filter((r) => r.score >= 60);
  if (pool.length === 0) {
    // Last resort: take the best available so we always return something.
    pool = [...eligible].sort((a, b) => b.score - a.score).slice(0, 5);
  }
  if (pool.length === 0) {
    // Nothing eligible at all — fall back to best-scoring overall.
    pool = trips
      .map((t) => buildRecommendation(preferences, t))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  // Deterministic-but-varied seed per invocation.
  const rand = mulberry32(Date.now() % 2147483647 || 1);

  const usedRegions = new Set<string>();

  // 6. Primary.
  const primary = weightedPick(pool, usedRegions, rand);
  usedRegions.add(primary.trip.region);

  // 7. Two backups, preferring different regions.
  const backups: TripRecommendation[] = [];
  const remaining = pool.filter((r) => r.trip.id !== primary.trip.id);
  while (backups.length < 2 && remaining.length > 0) {
    const pick = weightedPick(remaining, usedRegions, rand);
    backups.push(pick);
    usedRegions.add(pick.trip.region);
    const idx = remaining.findIndex((r) => r.trip.id === pick.trip.id);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  // 8. Explanation.
  const explanation = buildExplanation(primary);

  return { primary, backups, explanation };
}

function buildExplanation(primary: TripRecommendation): string {
  const t = primary.trip;
  const bits: string[] = [];
  bits.push(
    `This trip was selected because it fits your core constraints while adding more discovery value than the most obvious destinations.`
  );
  if (t.hiddenGemScore >= 4)
    bits.push(
      `${t.name} is a hidden gem (gem score ${t.hiddenGemScore}/5, popularity ${t.popularityScore}/5) — the kind of place that rewards getting off the beaten path.`
    );
  else
    bits.push(
      `${t.name} balances a solid ${primary.score}/100 match with something a little different from the usual headliners.`
    );
  return bits.join(" ");
}
