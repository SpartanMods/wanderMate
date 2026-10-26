import { test } from "node:test";
import assert from "node:assert/strict";
import tripZones from "@/data/tripZones";
import { rankWithLiveConditions } from "@/lib/liveRanking";
import { parseFireFilter } from "@/lib/fireFilter";
import type { ConditionsByZone, FireLevel, LiveConditions } from "@/lib/conditions/types";
import type { TripPreferences } from "@/lib/types";

const prefs: TripPreferences = {
  startingLocation: "Denver, CO",
  maxDriveTimeHours: 6,
  selectedActivities: { hiking: "important", stargazing: "nice_to_have" },
  experienceLevel: "intermediate",
  offGridPreference: 2,
  crowdTolerance: 2,
  vehicleCapability: "suv",
  campingPreference: "either",
  riskTolerance: 2,
  vibes: [],
  mustAvoid: [],
  gear: [],
};

const LIMIT = 7;

function restricted(level: FireLevel): LiveConditions {
  return {
    weather: null,
    fire: {
      hasActiveRestriction: true,
      restrictionLevel: level,
      affectedArea: null,
      source: "usfs",
      fetchedAt: "2026-07-01T00:00:00.000Z",
    },
    nearbyFacilities: [],
    fetchedAt: "2026-07-01T00:00:00.000Z",
    hasError: false,
    unavailableReason: null,
  };
}

const baseline = rankWithLiveConditions(prefs, tripZones, {}, new Set(), LIMIT);
const top = baseline.visible[0];

test("no live data: every zone unknown, nothing hidden, no fire penalty", () => {
  assert.ok(baseline.rankedCount > 1);
  assert.equal(baseline.hiddenCount, 0);
  assert.ok(baseline.visible.length <= LIMIT);
  assert.ok(baseline.visible.every((r) => r.breakdown.firePenalty === 0));
});

test("closure on the top zone lowers its score by 30 and explains why", () => {
  const conditions: ConditionsByZone = { [top.trip.id]: restricted("Closure") };
  const ranked = rankWithLiveConditions(prefs, tripZones, conditions, new Set(), tripZones.length);
  const rec = ranked.visible.find((r) => r.trip.id === top.trip.id);
  assert.ok(rec);
  assert.equal(rec.score, Math.max(0, top.score - 30));
  assert.match(rec.whyItMightNot[0], /Closure/);
  assert.notEqual(ranked.visible[0].trip.id, top.trip.id);
});

test("filter: hiding closures removes the zone and refills the list", () => {
  const conditions: ConditionsByZone = { [top.trip.id]: restricted("Closure") };
  const ranked = rankWithLiveConditions(prefs, tripZones, conditions, parseFireFilter("closure"), LIMIT);
  assert.equal(ranked.hiddenCount, 1);
  assert.ok(ranked.visible.every((r) => r.trip.id !== top.trip.id));
  assert.equal(ranked.visible.length, Math.min(LIMIT, ranked.rankedCount - 1));
});

test("filter: hiding unknown keeps only zones with known fire status", () => {
  const conditions: ConditionsByZone = { [top.trip.id]: restricted("Stage 1") };
  const ranked = rankWithLiveConditions(prefs, tripZones, conditions, parseFireFilter("unknown"), LIMIT);
  assert.deepEqual(ranked.visible.map((r) => r.trip.id), [top.trip.id]);
  assert.equal(ranked.hiddenCount, ranked.rankedCount - 1);
});
