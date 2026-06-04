/*
 * Top 3 Comparison domain logic for WanderMate.
 *
 * Pure, deterministic helpers that turn the *already-computed* top
 * recommendations into a compact, decision-focused comparison: which trip is
 * best overall, which is the safer/easier backup, which is more adventurous or
 * quieter, and what each one's main tradeoff is.
 *
 * This file intentionally does NOT re-run matching or scoring. It only reads
 * the existing TripRecommendation / TripZone fields and reframes them so the
 * results page can help a user actually choose. Keeping the logic here (rather
 * than inside a React component) keeps it testable and side-effect free.
 */

import {
  ACTIVITY_LABELS,
  VEHICLE_LABELS,
  VEHICLE_RANK,
} from "@/lib/constants";
import type {
  ConfidenceLevel,
  TripPreferences,
  TripRecommendation,
  TripZone,
  VehicleRequirement,
} from "@/lib/types";
import { titleCase } from "@/lib/utils";

export type ComparisonRole =
  | "best_overall"
  | "safest_backup"
  | "more_adventurous"
  | "quietest"
  | "easiest_access"
  | "best_hidden_gem"
  | "best_activity_fit"
  | "shortest_drive";

export type TripComparisonItem = {
  tripId: string;
  rank: number;
  name: string;
  score: number;
  qualityLabel: string;
  roles: ComparisonRole[];
  roleLabels: string[];
  driveHours: number;
  skillLabel: string;
  vehicleLabel: string;
  accessSummary: string;
  crowdSummary: string;
  offGridSummary: string;
  dataConfidenceSummary: string;
  riskSummary: string;
  strengths: string[];
  concerns: string[];
  mainTradeoff: string;
};

export type TopTripComparison = {
  headline: string;
  summary: string;
  items: TripComparisonItem[];
};

// ---------------------------------------------------------------------------
// Human-readable labels for each role.
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<ComparisonRole, string> = {
  best_overall: "Best overall",
  safest_backup: "Safer backup",
  more_adventurous: "More adventurous",
  quietest: "Quietest",
  easiest_access: "Easiest access",
  best_hidden_gem: "Hidden gem",
  best_activity_fit: "Best activity fit",
  shortest_drive: "Shortest drive",
};

/** Short descriptor used when building the headline/summary sentences. */
const ROLE_DESCRIPTORS: Record<ComparisonRole, string> = {
  best_overall: "the strongest overall match",
  safest_backup: "a safer, easier backup",
  more_adventurous: "a more adventurous option",
  quietest: "a quieter pick",
  easiest_access: "an easier-access backup",
  best_hidden_gem: "a hidden-gem option",
  best_activity_fit: "a stronger activity-fit option",
  shortest_drive: "a shorter-drive option",
};

// ---------------------------------------------------------------------------
// Small private helpers
// ---------------------------------------------------------------------------

function confidenceValue(level: ConfidenceLevel): number {
  return level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function vehicleCapabilityValue(vehicle: VehicleRequirement): number {
  return VEHICLE_RANK[vehicle];
}

/** Push value into array if absent and under the cap. Mutates in place. */
function uniquePush<T>(array: T[], value: T, max: number): void {
  if (array.length >= max) return;
  if (!array.includes(value)) array.push(value);
}

function accessDifficultyWord(difficulty: number): string {
  if (difficulty <= 1) return "Easy road";
  if (difficulty === 2) return "Mild road";
  if (difficulty === 3) return "Moderate road";
  if (difficulty === 4) return "Rough road";
  return "Very rough road";
}

function crowdWord(level: number): string {
  return ["Empty", "Quiet", "Moderate", "Busy", "Packed"][level - 1] ?? "Moderate";
}

function offGridWord(level: number): string {
  return (
    ["Accessible", "Semi-remote", "Off-grid", "Backcountry"][level - 1] ??
    "Semi-remote"
  );
}

function formatAccessSummary(trip: TripZone): string {
  const word = accessDifficultyWord(trip.roadAccess.accessRoadDifficulty);
  return trip.roadAccess.fourWheelDriveRequired ? `${word} · 4WD` : word;
}

function formatCrowdSummary(trip: TripZone): string {
  return `${crowdWord(trip.crowdLevel)} (${trip.crowdLevel}/5)`;
}

function formatOffGridSummary(trip: TripZone): string {
  return `${offGridWord(trip.offGridLevel)} (${trip.offGridLevel}/4)`;
}

function formatDataConfidenceSummary(trip: TripZone): string {
  return `${titleCase(trip.dataQuality.overall.level)} overall`;
}

/** A coarse rugged/risk word from off-grid, road, vehicle, and cell service. */
function formatRiskSummary(rec: TripRecommendation): string {
  const t = rec.trip;
  let rugged = t.offGridLevel + t.roadAccess.accessRoadDifficulty;
  if (t.roadAccess.fourWheelDriveRequired) rugged += 2;
  if (t.remoteness.cellServiceLikelihood <= 2) rugged += 2;
  if (rugged <= 4) return "Low";
  if (rugged <= 7) return "Moderate";
  if (rugged <= 10) return "High";
  return "Serious";
}

// ---------------------------------------------------------------------------
// Role scoring. Each returns a comparable number; higher = stronger for that
// role. These are relative measures used only to rank the top 3 against each
// other — they never change displayed scores or ordering.
// ---------------------------------------------------------------------------

function safetyScore(rec: TripRecommendation): number {
  const { trip, breakdown } = rec;
  let s = 0;
  s += breakdown.riskFit; // higher = better risk fit
  s += breakdown.riskPenalty; // negative or 0; less negative is safer
  s += (4 - trip.offGridLevel) * 1.5;
  s += (5 - trip.roadAccess.accessRoadDifficulty) * 1.2;
  s += trip.remoteness.cellServiceLikelihood * 1.0;
  s += confidenceValue(trip.dataQuality.overall.level) * 1.0;
  s += confidenceValue(trip.dataQuality.access.level) * 1.0;
  s += confidenceValue(trip.dataQuality.legality.level) * 1.5;
  s += (4 - vehicleCapabilityValue(trip.vehicleRequirement)) * 1.0;
  if (trip.roadAccess.fourWheelDriveRequired) s -= 3;
  return s;
}

function adventureScore(rec: TripRecommendation): number {
  const t = rec.trip;
  let s = 0;
  s += t.offGridLevel * 2;
  s += t.hiddenGemScore * 1.0;
  s +=
    (t.activities.backpacking +
      t.activities.overlanding +
      t.activities.dirtBikingOhv +
      t.activities.climbing +
      t.activities.mountainBiking) *
    0.6;
  s += (5 - t.crowdLevel) * 0.5;
  s += t.roadAccess.accessRoadDifficulty * 0.8;
  return s;
}

function quietScore(rec: TripRecommendation): number {
  const t = rec.trip;
  let s = 0;
  s += (5 - t.crowdLevel) * 2;
  s += t.hiddenGemScore * 1.5;
  s += (5 - t.popularityScore) * 1.5;
  return s;
}

/** Higher = easier to actually reach. */
function accessScore(rec: TripRecommendation): number {
  const t = rec.trip;
  let s = 0;
  s += (5 - t.roadAccess.accessRoadDifficulty) * 2;
  s += (4 - vehicleCapabilityValue(t.vehicleRequirement)) * 1.5;
  s += t.roadAccess.fourWheelDriveRequired ? -4 : 2;
  s += Math.max(0, 6 - rec.effectiveDriveHours);
  s += confidenceValue(t.dataQuality.access.level) * 1.5;
  return s;
}

function hiddenGemValue(rec: TripRecommendation): number {
  return rec.trip.hiddenGemScore * 2 + (5 - rec.trip.popularityScore);
}

// ---------------------------------------------------------------------------
// Strengths / concerns / tradeoffs
// ---------------------------------------------------------------------------

/** Concise activity-oriented strengths drawn from the user's selections. */
function getTopActivityStrengths(
  prefs: TripPreferences,
  rec: TripRecommendation
): string[] {
  const trip = rec.trip;
  const selected = Object.entries(prefs.selectedActivities) as [
    keyof typeof prefs.selectedActivities,
    string
  ][];

  const strongMustHaves = selected
    .filter(([key, w]) => w === "must_have" && (trip.activities[key] ?? 0) >= 4)
    .map(([key]) => ACTIVITY_LABELS[key]);
  if (strongMustHaves.length >= 1) {
    return [
      `Strong on your must-haves: ${strongMustHaves.slice(0, 3).join(", ")}.`,
    ];
  }

  const strongSelected = selected
    .filter(([key, w]) => !!w && (trip.activities[key] ?? 0) >= 4)
    .map(([key]) => ACTIVITY_LABELS[key]);
  if (strongSelected.length >= 1) {
    return [`Good fit for ${strongSelected.slice(0, 3).join(", ")}.`];
  }
  return [];
}

/** Concrete, intrinsic tradeoffs for a single trip given the user's inputs. */
function getConcerns(
  prefs: TripPreferences,
  rec: TripRecommendation
): string[] {
  const trip = rec.trip;
  const out: string[] = [];

  if (trip.roadAccess.fourWheelDriveRequired) {
    uniquePush(out, "Needs real 4WD to reach.", 3);
  } else if (trip.roadAccess.accessRoadDifficulty >= 4) {
    uniquePush(out, "Rougher access — verify road conditions.", 3);
  }
  if (trip.remoteness.cellServiceLikelihood <= 2) {
    uniquePush(out, "Lower cell-service likelihood.", 3);
  }
  if (prefs.crowdTolerance >= 3 && trip.crowdLevel >= 4) {
    uniquePush(out, "More crowded than your quiet preference.", 3);
  }
  if (trip.legality.permitLikelyRequired) {
    uniquePush(out, "Permit likely required — verify before committing.", 3);
  }
  if (
    trip.legality.ohvLegal === "unknown" ||
    trip.legality.ohvLegal === "area_specific"
  ) {
    uniquePush(out, "OHV legality is area-specific — confirm legal routes.", 3);
  }
  if (trip.legality.dispersedCampingAllowed === "unknown") {
    uniquePush(out, "Confirm where dispersed camping is allowed.", 3);
  }
  if (trip.dataQuality.overall.level !== "high") {
    uniquePush(
      out,
      `Some details are ${trip.dataQuality.overall.level} confidence — verify before you go.`,
      3
    );
  } else if (trip.dataQuality.legality.level === "low") {
    uniquePush(out, "Legality is area-specific — verify before committing.", 3);
  }
  if (trip.offGridLevel >= 3 && out.length < 3) {
    uniquePush(out, "Remote — plan for limited services and help.", 3);
  }

  return out.slice(0, 3);
}

/** One direct sentence naming this item's headline tradeoff. */
function getMainTradeoff(
  prefs: TripPreferences,
  rec: TripRecommendation,
  roles: ComparisonRole[]
): string {
  const trip = rec.trip;

  if (roles.includes("best_overall")) {
    if (
      trip.roadAccess.fourWheelDriveRequired ||
      trip.roadAccess.accessRoadDifficulty >= 4
    ) {
      return "Best overall fit, but it asks more from your vehicle and access planning.";
    }
    if (trip.offGridLevel >= 3 || trip.remoteness.cellServiceLikelihood <= 2) {
      return "Best overall fit, but it's remote — plan for limited services.";
    }
    if (trip.dataQuality.overall.level !== "high") {
      return "Best overall fit, but verify the lower-confidence details before committing.";
    }
    return "Strongest overall match with no major tradeoff against the other top picks.";
  }
  if (roles.includes("more_adventurous")) {
    return "Most adventurous of the top picks, but it carries the highest planning and verification burden.";
  }
  if (roles.includes("safest_backup")) {
    return "Lower-risk, easier backup, but not the strongest overall match.";
  }
  if (roles.includes("easiest_access")) {
    return "Easiest to reach, but less remote than the others.";
  }
  if (roles.includes("quietest")) {
    return "Quietest option, but you trade some overall fit to get the solitude.";
  }
  if (roles.includes("best_hidden_gem")) {
    return "Most hidden-gem oriented, but verify access and rules before committing.";
  }
  if (roles.includes("shortest_drive")) {
    return "Shortest drive of the top picks, but it isn't the strongest match overall.";
  }
  if (roles.includes("best_activity_fit")) {
    return "Strongest on your activities of the backups, but it ranks lower overall.";
  }
  return "A close alternative, but it doesn't lead on any single dimension.";
}

// ---------------------------------------------------------------------------
// Ranking helpers across the top 3
// ---------------------------------------------------------------------------

/** Index of the highest score among backups (indices >= 1), or -1. */
function bestBackupIndex(scores: number[]): number {
  let best = -1;
  for (let i = 1; i < scores.length; i++) {
    if (best === -1 || scores[i] > scores[best]) best = i;
  }
  return best;
}

/** Index of the minimum value (ties resolve to the lower index). */
function minIndex(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[best]) best = i;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a Top 3 Comparison from the already-ranked recommendation list.
 *
 * - Uses the first `limit` (default 3) recommendations in their current order.
 * - Returns null when there are fewer than 2 recommendations to compare.
 * - Never mutates, re-scores, or re-orders the input recommendations.
 */
export function buildTopTripComparison(
  prefs: TripPreferences,
  recommendations: TripRecommendation[],
  limit = 3
): TopTripComparison | null {
  if (recommendations.length < 2) return null;

  const top = recommendations.slice(0, Math.max(2, limit));

  // Pre-compute the relative role scores once.
  const safety = top.map(safetyScore);
  const adventure = top.map(adventureScore);
  const quiet = top.map(quietScore);
  const access = top.map(accessScore);
  const gem = top.map(hiddenGemValue);
  const activity = top.map((r) => r.breakdown.activityFit);
  const drive = top.map((r) => r.effectiveDriveHours);

  const rolesPer: ComparisonRole[][] = top.map(() => []);
  const MAX_ROLES = 3;

  // The first recommendation is always the best overall by definition.
  rolesPer[0].push("best_overall");

  // Safer backup — most safety-favorable backup that's at least as safe as top.
  const sb = bestBackupIndex(safety);
  if (sb > 0 && safety[sb] >= safety[0]) {
    uniquePush(rolesPer[sb], "safest_backup", MAX_ROLES);
  }

  // More adventurous — a backup that's genuinely more rugged than the top pick,
  // isn't a weak match, and doesn't carry severe concerns.
  const ad = bestBackupIndex(adventure);
  if (
    ad > 0 &&
    adventure[ad] > adventure[0] &&
    top[ad].score >= 55 &&
    !rolesPer[ad].includes("safest_backup") &&
    getConcerns(prefs, top[ad]).length < 3
  ) {
    uniquePush(rolesPer[ad], "more_adventurous", MAX_ROLES);
  }

  // Quietest — a backup quieter than the top pick. Weighted by the user caring
  // about quiet, but still surfaced when the gap is real.
  const qz = bestBackupIndex(quiet);
  if (qz > 0 && quiet[qz] > quiet[0]) {
    uniquePush(rolesPer[qz], "quietest", MAX_ROLES);
  }

  // Easiest access — a backup that's easier to reach than the top pick.
  const ea = bestBackupIndex(access);
  if (
    ea > 0 &&
    access[ea] > access[0] &&
    !rolesPer[ea].includes("more_adventurous")
  ) {
    uniquePush(rolesPer[ea], "easiest_access", MAX_ROLES);
  }

  // Best hidden gem — only when genuinely gem-y (4 or 5) and beats the top.
  const hg = bestBackupIndex(gem);
  if (hg > 0 && top[hg].trip.hiddenGemScore >= 4 && gem[hg] >= gem[0]) {
    uniquePush(rolesPer[hg], "best_hidden_gem", MAX_ROLES);
  }

  // Best activity fit — useful mainly when a backup out-fits the top pick.
  const af = bestBackupIndex(activity);
  if (af > 0 && activity[af] > activity[0]) {
    uniquePush(rolesPer[af], "best_activity_fit", MAX_ROLES);
  }

  // Shortest drive — only if meaningfully shorter (>= 30 min) than the rest.
  const shortest = minIndex(drive);
  if (shortest > 0) {
    const otherMin = Math.min(
      ...drive.filter((_, i) => i !== shortest)
    );
    if (otherMin - drive[shortest] >= 0.5) {
      uniquePush(rolesPer[shortest], "shortest_drive", MAX_ROLES);
    }
  }

  // Guarantee at least one backup is framed by a useful tradeoff.
  const anyBackupLabeled = rolesPer
    .slice(1)
    .some((roles) => roles.length > 0);
  if (!anyBackupLabeled) {
    const fallback = sb > 0 ? sb : 1;
    uniquePush(rolesPer[fallback], "safest_backup", MAX_ROLES);
  }

  // Build the per-item view models.
  const items: TripComparisonItem[] = top.map((rec, i) => {
    const roles = rolesPer[i];
    const trip = rec.trip;

    const strengths: string[] = [];
    if (i === 0) {
      uniquePush(strengths, `Best overall match at ${rec.score}/100.`, 4);
    } else {
      uniquePush(
        strengths,
        `${rec.qualityLabel} at ${rec.score}/100.`,
        4
      );
    }
    for (const s of getTopActivityStrengths(prefs, rec)) {
      uniquePush(strengths, s, 4);
    }
    if (roles.includes("best_activity_fit")) {
      uniquePush(strengths, "Strongest activity fit of the top picks.", 4);
    }
    if (roles.includes("quietest")) {
      uniquePush(
        strengths,
        "Lower crowd profile than the other top options.",
        4
      );
    }
    if (roles.includes("easiest_access")) {
      uniquePush(
        strengths,
        "Easier road access and stronger access confidence.",
        4
      );
    }
    if (roles.includes("more_adventurous")) {
      uniquePush(
        strengths,
        "Most remote and adventurous of the top picks.",
        4
      );
    }
    if (roles.includes("best_hidden_gem")) {
      uniquePush(
        strengths,
        `Hidden-gem oriented (gem ${trip.hiddenGemScore}/5, popularity ${trip.popularityScore}/5).`,
        4
      );
    }
    if (roles.includes("safest_backup")) {
      uniquePush(
        strengths,
        "Lower-risk access than the top pick.",
        4
      );
    }
    if (roles.includes("shortest_drive")) {
      uniquePush(
        strengths,
        `Shortest drive of the top picks (~${rec.effectiveDriveHours} hrs).`,
        4
      );
    }
    if (strengths.length < 2 && trip.dataQuality.overall.level === "high") {
      uniquePush(strengths, "High data confidence overall.", 4);
    }

    const concerns = getConcerns(prefs, rec);
    // Comparative concern: noticeably longer drive than every other top option.
    const maxOtherDrive = Math.min(
      ...drive.filter((_, j) => j !== i)
    );
    if (
      drive[i] - maxOtherDrive >= 0.5 &&
      drive[i] === Math.max(...drive) &&
      concerns.length < 3
    ) {
      uniquePush(concerns, "Longer drive than the other top options.", 3);
    }
    if (concerns.length === 0) {
      concerns.push("No standout drawbacks — verify current conditions.");
    }

    return {
      tripId: trip.id,
      rank: i + 1,
      name: trip.name,
      score: rec.score,
      qualityLabel: rec.qualityLabel,
      roles,
      roleLabels: roles.map((r) => ROLE_LABELS[r]),
      driveHours: rec.effectiveDriveHours,
      skillLabel: titleCase(trip.skillLevel),
      vehicleLabel: VEHICLE_LABELS[trip.vehicleRequirement],
      accessSummary: formatAccessSummary(trip),
      crowdSummary: formatCrowdSummary(trip),
      offGridSummary: formatOffGridSummary(trip),
      dataConfidenceSummary: formatDataConfidenceSummary(trip),
      riskSummary: formatRiskSummary(rec),
      strengths: strengths.slice(0, 4),
      concerns: concerns.slice(0, 3),
      mainTradeoff: getMainTradeoff(prefs, rec, roles),
    };
  });

  return {
    headline: buildHeadline(items),
    summary: buildSummary(items),
    items,
  };
}

// ---------------------------------------------------------------------------
// Headline / summary copy
// ---------------------------------------------------------------------------

function buildHeadline(items: TripComparisonItem[]): string {
  // One descriptor per item, using its primary (first) role.
  const descriptors: string[] = [];
  for (const item of items) {
    const primary = item.roles[0];
    if (!primary) continue;
    const d = ROLE_DESCRIPTORS[primary];
    if (!descriptors.includes(d)) descriptors.push(d);
  }
  if (descriptors.length <= 1) {
    return "Your top pick leads on overall fit — here's how the backups compare.";
  }
  const last = descriptors[descriptors.length - 1];
  const head = descriptors.slice(0, -1).join(", ");
  return `Your top ${items.length} split into ${head}, and ${last}.`;
}

function buildSummary(items: TripComparisonItem[]): string {
  const backupRoles = new Set<ComparisonRole>();
  for (const item of items.slice(1)) {
    for (const role of item.roles) backupRoles.add(role);
  }

  const tradeoffs: string[] = [];
  if (backupRoles.has("safest_backup")) tradeoffs.push("lower risk");
  if (backupRoles.has("easiest_access")) tradeoffs.push("easier access");
  if (backupRoles.has("shortest_drive")) tradeoffs.push("a shorter drive");
  if (backupRoles.has("quietest")) tradeoffs.push("more solitude");
  if (backupRoles.has("best_hidden_gem")) tradeoffs.push("more of a hidden gem");
  if (backupRoles.has("more_adventurous")) tradeoffs.push("more adventure");
  if (backupRoles.has("best_activity_fit"))
    tradeoffs.push("a stronger activity fit");

  if (tradeoffs.length === 0) {
    return "The top pick is the strongest overall match; the backups are close alternatives if its tradeoffs don't suit you.";
  }

  const last = tradeoffs[tradeoffs.length - 1];
  const joined =
    tradeoffs.length === 1
      ? last
      : `${tradeoffs.slice(0, -1).join(", ")} or ${last}`;
  return `The top pick is the strongest overall match. The backups trade some overall fit for ${joined}, so pick the column that matches what you care about most.`;
}
