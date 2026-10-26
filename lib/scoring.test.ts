import { test } from "node:test";
import assert from "node:assert/strict";
import { hasHardConstraintViolation, missingMustHavePenalty } from "@/lib/scoring";
import type { TripPreferences, TripZone } from "@/lib/types";

function basePrefs(overrides: Partial<TripPreferences> = {}): TripPreferences {
  return {
    startingLocation: "Denver, CO",
    maxDriveTimeHours: 4,
    selectedActivities: {},
    experienceLevel: "intermediate",
    offGridPreference: 2,
    crowdTolerance: 2,
    vehicleCapability: "suv",
    campingPreference: "either",
    riskTolerance: 2,
    vibes: [],
    mustAvoid: [],
    gear: [],
    ...overrides,
  };
}

function baseZone(overrides: Partial<TripZone> = {}): TripZone {
  return {
    id: "test-zone",
    name: "Test Zone",
    region: "Test Region",
    state: "CO",
    summary: "A test zone",
    generalArea: "Test area",
    activities: {
      dispersedCamping: 3, developedCamping: 0, hiking: 3,
      backpacking: 0, dirtBikingOhv: 0, overlanding: 2,
      fishing: 2, kayaking: 0, canoeing: 0, motorBoating: 0,
      lakeAccess: 0, scenicDrive: 3, wildlife: 2, photography: 3,
      winterAccess: 1, climbing: 0, mountainBiking: 0,
      stargazing: 3, golf: 0, dining: 0,
    },
    skillLevel: "intermediate",
    minRecommendedSkill: "beginner",
    offGridLevel: 2,
    crowdLevel: 2,
    hiddenGemScore: 3,
    popularityScore: 3,
    vehicleRequirement: "suv",
    campingTypes: ["dispersed"],
    driveTimeFromDenverHours: 2,
    bestSeasons: ["spring", "summer", "fall"],
    vibes: ["Forest"],
    avoidFlags: [],
    watchouts: [],
    safetyNotes: [],
    suggestedItinerary: [],
    backupOptions: [],
    sourceLinks: [],
    dataConfidence: "high",
    landManager: "usfs",
    dataQuality: {
      overall: { level: "high", notes: "" },
      access: { level: "high", notes: "" },
      camping: { level: "high", notes: "" },
      activities: { level: "high", notes: "" },
      legality: { level: "high", notes: "" },
      seasonality: { level: "high", notes: "" },
      lastReviewedAt: "2026-01-01",
    },
    sensitiveLocationLevel: "generalized",
    roadAccess: {
      accessRoadDifficulty: 2,
      clearanceNeeded: "low_clearance",
      fourWheelDriveRequired: false,
      trailerFriendly: true,
      winterAccessRisk: 2,
    },
    legality: {
      dispersedCampingAllowed: "yes",
      campfireRestrictionsCommon: false,
      permitLikelyRequired: false,
      ohvLegal: "yes",
      platedVehicleRequired: "yes",
    },
    remoteness: {
      cellServiceLikelihood: 3,
      nearestTown: "Testville",
      fuelDistanceMilesEstimate: 20,
      waterAvailability: "seasonal",
    },
    verificationLinks: [],
    ...overrides,
  };
}

test("hard constraint: winter-only zone fails for a summer trip", () => {
  const prefs = basePrefs({ startDate: "2026-07-15" });
  const zone = baseZone({ bestSeasons: ["winter"] });
  assert.equal(hasHardConstraintViolation(prefs, zone), true);
});

test("hard constraint: all-season zone does not fail for a summer trip", () => {
  const prefs = basePrefs({ startDate: "2026-07-15" });
  const zone = baseZone({ bestSeasons: ["spring", "summer", "fall", "winter"] });
  assert.equal(hasHardConstraintViolation(prefs, zone), false);
});

test("hard constraint: OHV must-have + zone OHV illegal = hard fail", () => {
  const prefs = basePrefs({
    selectedActivities: { dirtBikingOhv: "must_have" },
  });
  const zone = baseZone({
    legality: {
      dispersedCampingAllowed: "yes",
      campfireRestrictionsCommon: false,
      permitLikelyRequired: false,
      ohvLegal: "no",
      platedVehicleRequired: "yes",
    },
  });
  assert.equal(hasHardConstraintViolation(prefs, zone), true);
});

test("hard constraint: OHV must-have + zone OHV legal = no hard fail", () => {
  const prefs = basePrefs({
    selectedActivities: { dirtBikingOhv: "must_have" },
  });
  const zone = baseZone();
  assert.equal(hasHardConstraintViolation(prefs, zone), false);
});

test("missing must-have penalty: -10 per activity", () => {
  assert.equal(missingMustHavePenalty(0), 0);
  assert.equal(missingMustHavePenalty(1), 10);
  assert.equal(missingMustHavePenalty(2), 20);
  assert.equal(missingMustHavePenalty(4), 40);
});

test("missing must-have penalty: capped at 45 from 5 missing", () => {
  assert.equal(missingMustHavePenalty(5), 45);
  assert.equal(missingMustHavePenalty(8), 45);
});
