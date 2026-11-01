/*
 * Unit tests for the Top 3 Comparison logic (lib/comparison.ts).
 *
 * Runs on Node's built-in test runner (node:test) with native TypeScript
 * support — no third-party test framework. Execute with:
 *   npm test
 * which wires in scripts/register-loader.mjs to resolve "@/..." aliases.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildTopTripComparison, ROLE_LABELS } from "@/lib/comparison";
import { getRecommendations } from "@/lib/matching";
import tripZones from "@/data/tripZones";
import type {
  ActivityKey,
  ScoreBreakdown,
  TripPreferences,
  TripRecommendation,
  TripZone,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Fixture factories — minimal defaults, overridable per test.
// ---------------------------------------------------------------------------

const ACTIVITY_KEYS: ActivityKey[] = [
  "dispersedCamping",
  "developedCamping",
  "hiking",
  "backpacking",
  "dirtBikingOhv",
  "overlanding",
  "fishing",
  "kayaking",
  "canoeing",
  "motorBoating",
  "lakeAccess",
  "scenicDrive",
  "wildlife",
  "photography",
  "winterAccess",
  "climbing",
  "mountainBiking",
  "stargazing",
  "golf",
  "dining",
];

function zeroActivities(): Record<ActivityKey, number> {
  return ACTIVITY_KEYS.reduce(
    (acc, k) => {
      acc[k] = 0;
      return acc;
    },
    {} as Record<ActivityKey, number>
  );
}

const cat = (level: "high" | "medium" | "low") => ({ level, notes: "test" });

/** Like Partial<TripZone>, but the nested objects accept partials too. */
type TripOverrides = Partial<
  Omit<
    TripZone,
    "activities" | "roadAccess" | "remoteness" | "legality" | "dataQuality"
  >
> & {
  activities?: Partial<Record<ActivityKey, number>>;
  roadAccess?: Partial<TripZone["roadAccess"]>;
  remoteness?: Partial<TripZone["remoteness"]>;
  legality?: Partial<TripZone["legality"]>;
  dataQuality?: Partial<TripZone["dataQuality"]>;
};

function makeTrip(overrides: TripOverrides = {}): TripZone {
  const base: TripZone = {
    id: "t",
    name: "Test Zone",
    region: "Test Region",
    state: "CO",
    summary: "A test zone.",
    generalArea: "Somewhere",
    activities: { ...zeroActivities(), ...(overrides.activities ?? {}) },
    skillLevel: "intermediate",
    minRecommendedSkill: "beginner",
    offGridLevel: 2,
    crowdLevel: 3,
    hiddenGemScore: 3,
    popularityScore: 3,
    vehicleRequirement: "suv",
    campingTypes: ["dispersed"],
    driveTimeFromDenverHours: 3,
    bestSeasons: ["summer"],
    vibes: [],
    avoidFlags: [],
    watchouts: [],
    safetyNotes: [],
    suggestedItinerary: [],
    backupOptions: [],
    sourceLinks: [],
    dataConfidence: "high",
    landManager: "usfs",
    dataQuality: {
      overall: cat("high"),
      access: cat("high"),
      camping: cat("high"),
      activities: cat("high"),
      legality: cat("high"),
      seasonality: cat("high"),
      lastReviewedAt: "2026-01-01",
    },
    sensitiveLocationLevel: "none",
    roadAccess: {
      accessRoadDifficulty: 2,
      clearanceNeeded: "none",
      fourWheelDriveRequired: false,
      trailerFriendly: true,
      winterAccessRisk: 2,
    },
    legality: {
      dispersedCampingAllowed: "yes",
      campfireRestrictionsCommon: false,
      permitLikelyRequired: false,
      ohvLegal: "yes",
      platedVehicleRequired: "no",
    },
    remoteness: {
      cellServiceLikelihood: 4,
      nearestTown: "Townsville",
      fuelDistanceMilesEstimate: 20,
      waterAvailability: "reliable",
    },
    verificationLinks: [],
  };

  // Merge nested objects we commonly tweak so callers can pass partials.
  return {
    ...base,
    ...overrides,
    activities: base.activities,
    dataQuality: { ...base.dataQuality, ...(overrides.dataQuality ?? {}) },
    roadAccess: { ...base.roadAccess, ...(overrides.roadAccess ?? {}) },
    legality: { ...base.legality, ...(overrides.legality ?? {}) },
    remoteness: { ...base.remoteness, ...(overrides.remoteness ?? {}) },
  };
}

function makeBreakdown(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  const score = overrides.finalScore ?? 75;
  return {
    activityFit: 20,
    driveTimeFit: 9,
    skillFit: 11,
    offGridFit: 10,
    crowdFit: 7,
    vehicleFit: 9,
    campingFit: 5,
    vibeFit: 5,
    gearFit: 3,
    seasonFit: 4,
    riskFit: 7,
    penalties: 0,
    riskPenalty: 0,
    hiddenGemBoost: 0,
    firePenalty: 0,
    finalScore: score,
    ...overrides,
  };
}

function makeRec(opts: {
  id: string;
  score: number;
  drive: number;
  trip?: TripOverrides;
  breakdown?: Partial<ScoreBreakdown>;
}): TripRecommendation {
  const trip = makeTrip({ id: opts.id, name: opts.id, ...opts.trip });
  const breakdown = makeBreakdown({ finalScore: opts.score, ...opts.breakdown });
  return {
    trip,
    score: opts.score,
    qualityLabel: opts.score >= 80 ? "Strong match" : "Good match",
    breakdown,
    whyItMatches: [],
    whyItMightNot: [],
    effectiveDriveHours: opts.drive,
  };
}

const prefs: TripPreferences = {
  startingLocation: "Denver, CO",
  maxDriveTimeHours: 6,
  selectedActivities: { hiking: "must_have", dispersedCamping: "important" },
  experienceLevel: "intermediate",
  offGridPreference: 3,
  crowdTolerance: 3,
  vehicleCapability: "suv",
  campingPreference: "either",
  riskTolerance: 2,
  vibes: ["Remote and quiet"],
  mustAvoid: [],
  gear: [],
};

// ---------------------------------------------------------------------------
// Guard / contract tests
// ---------------------------------------------------------------------------

test("returns null with fewer than 2 recommendations", () => {
  assert.equal(buildTopTripComparison(prefs, []), null);
  assert.equal(
    buildTopTripComparison(prefs, [makeRec({ id: "a", score: 80, drive: 2 })]),
    null
  );
});

test("uses the first `limit` recommendations in order, capped at the list length", () => {
  const recs = [
    makeRec({ id: "a", score: 88, drive: 2 }),
    makeRec({ id: "b", score: 80, drive: 3 }),
    makeRec({ id: "c", score: 74, drive: 4 }),
    makeRec({ id: "d", score: 60, drive: 5 }),
  ];
  const three = buildTopTripComparison(prefs, recs, 3);
  assert.ok(three);
  assert.equal(three.items.length, 3);
  assert.deepEqual(
    three.items.map((i) => i.tripId),
    ["a", "b", "c"]
  );

  const two = buildTopTripComparison(prefs, recs, 2);
  assert.equal(two?.items.length, 2);
});

test("does not mutate or re-order the input recommendations", () => {
  const recs = [
    makeRec({ id: "a", score: 88, drive: 2 }),
    makeRec({ id: "b", score: 80, drive: 3 }),
    makeRec({ id: "c", score: 74, drive: 4 }),
  ];
  const snapshot = JSON.stringify(recs);
  buildTopTripComparison(prefs, recs, 3);
  assert.equal(JSON.stringify(recs), snapshot);
});

test("rank 1 is always labeled best_overall", () => {
  const recs = [
    makeRec({ id: "a", score: 65, drive: 2 }),
    makeRec({ id: "b", score: 64, drive: 3 }),
  ];
  const result = buildTopTripComparison(prefs, recs, 3);
  assert.ok(result?.items[0].roles.includes("best_overall"));
  assert.equal(result?.items[0].rank, 1);
});

// ---------------------------------------------------------------------------
// Role assignment
// ---------------------------------------------------------------------------

test("differentiates a safer/easier backup from a more adventurous one", () => {
  const recs = [
    // Top: best overall but rough and remote.
    makeRec({
      id: "top",
      score: 85,
      drive: 4,
      trip: {
        offGridLevel: 3,
        crowdLevel: 2,
        hiddenGemScore: 4,
        popularityScore: 3,
        roadAccess: { accessRoadDifficulty: 4, fourWheelDriveRequired: true },
        remoteness: { cellServiceLikelihood: 2 },
        activities: { backpacking: 5, hiking: 5 },
      },
      breakdown: { riskFit: 4, riskPenalty: -6, activityFit: 26 },
    }),
    // Backup 1: easy, safe, close, well-documented.
    makeRec({
      id: "easy",
      score: 78,
      drive: 2,
      trip: {
        offGridLevel: 1,
        crowdLevel: 4,
        hiddenGemScore: 2,
        popularityScore: 4,
        vehicleRequirement: "any_car",
        roadAccess: { accessRoadDifficulty: 1, fourWheelDriveRequired: false },
        remoteness: { cellServiceLikelihood: 5 },
        activities: { hiking: 4 },
      },
      breakdown: { riskFit: 9, riskPenalty: 0, activityFit: 18 },
    }),
    // Backup 2: most adventurous / quietest / hidden gem.
    makeRec({
      id: "wild",
      score: 70,
      drive: 5,
      trip: {
        offGridLevel: 4,
        crowdLevel: 1,
        hiddenGemScore: 5,
        popularityScore: 1,
        roadAccess: { accessRoadDifficulty: 5, fourWheelDriveRequired: false },
        remoteness: { cellServiceLikelihood: 4 },
        activities: { backpacking: 5, overlanding: 4, climbing: 4 },
      },
      breakdown: { riskFit: 5, riskPenalty: 0, activityFit: 16 },
    }),
  ];

  const result = buildTopTripComparison(prefs, recs, 3);
  assert.ok(result);

  const [top, easy, wild] = result.items;
  assert.ok(top.roles.includes("best_overall"));
  assert.ok(
    easy.roles.includes("safest_backup") ||
      easy.roles.includes("easiest_access"),
    `expected easy backup to be safer/easier, got ${easy.roles.join(",")}`
  );
  assert.ok(
    wild.roles.includes("more_adventurous") ||
      wild.roles.includes("quietest") ||
      wild.roles.includes("best_hidden_gem"),
    `expected wild backup to read as adventurous/quiet/gem, got ${wild.roles.join(",")}`
  );
});

test("guarantees at least one backup is framed by a tradeoff", () => {
  const recs = [
    makeRec({ id: "a", score: 80, drive: 3 }),
    makeRec({ id: "b", score: 79, drive: 3 }),
    makeRec({ id: "c", score: 78, drive: 3 }),
  ];
  const result = buildTopTripComparison(prefs, recs, 3);
  assert.ok(result);
  const anyBackupLabeled = result.items
    .slice(1)
    .some((i) => i.roles.length > 0);
  assert.ok(anyBackupLabeled);
});

// ---------------------------------------------------------------------------
// Per-item shape invariants (run against real seed data + several profiles)
// ---------------------------------------------------------------------------

const profiles: TripPreferences[] = [
  prefs,
  { ...prefs, crowdTolerance: 1, riskTolerance: 4, offGridPreference: 4 },
  {
    ...prefs,
    experienceLevel: "beginner",
    riskTolerance: 1,
    vehicleCapability: "any_car",
    crowdTolerance: 2,
  },
  {
    ...prefs,
    selectedActivities: { dirtBikingOhv: "must_have", overlanding: "important" },
    vehicleCapability: "high_clearance_4x4",
  },
];

test("every item satisfies display invariants across real data + profiles", () => {
  for (const p of profiles) {
    const recs = getRecommendations(p, tripZones);
    const result = buildTopTripComparison(p, recs, 3);
    if (recs.length < 2) {
      assert.equal(result, null);
      continue;
    }
    assert.ok(result);
    assert.ok(result.headline.length > 0);
    assert.ok(result.summary.length > 0);

    // Contract: top is best_overall, and at least one backup is framed.
    assert.ok(result.items[0].roles.includes("best_overall"));
    assert.ok(result.items.slice(1).some((i) => i.roles.length > 0));

    for (const item of result.items) {
      // Roles capped at 3, with labels aligned 1:1 to roles. A secondary
      // backup may legitimately lead on nothing (0 roles).
      assert.ok(item.roles.length <= 3);
      assert.equal(item.roleLabels.length, item.roles.length);
      item.roles.forEach((r, idx) => {
        assert.equal(item.roleLabels[idx], ROLE_LABELS[r]);
      });

      // Strengths 1-4, concerns 1-3, tradeoff present.
      assert.ok(item.strengths.length >= 1 && item.strengths.length <= 4);
      assert.ok(item.concerns.length >= 1 && item.concerns.length <= 3);
      assert.ok(item.mainTradeoff.length > 0);

      // Metric strings are all populated.
      for (const field of [
        item.accessSummary,
        item.crowdSummary,
        item.offGridSummary,
        item.dataConfidenceSummary,
        item.riskSummary,
        item.skillLabel,
        item.vehicleLabel,
      ]) {
        assert.ok(typeof field === "string" && field.length > 0);
      }
      assert.equal(typeof item.score, "number");
      assert.equal(typeof item.driveHours, "number");
    }
  }
});
