import { test } from "node:test";
import assert from "node:assert/strict";
import tripZones from "@/data/tripZones";
import { getRandomTripRecommendation } from "@/lib/randomTrip";
import { getRecommendations, type FireStatusByZone } from "@/lib/matching";
import type { TripPreferences } from "@/lib/types";

const prefs: TripPreferences = {
  startingLocation: "Denver, CO",
  maxDriveTimeHours: 6,
  selectedActivities: { hiking: "must_have" },
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

test("surprise: fire statuses lower scores and add the fire note", () => {
  const allClosed: FireStatusByZone = Object.fromEntries(tripZones.map((z) => [z.id, "Closure"]));
  const { primary } = getRandomTripRecommendation(prefs, tripZones, allClosed);
  assert.equal(primary.breakdown.firePenalty, -30);
  assert.match(primary.whyItMightNot[0], /Closure/);
});

test("surprise: a closed zone drops out of the pick pool", () => {
  const ranked = getRecommendations(prefs, tripZones);
  const target = ranked[0];
  const fireByZone: FireStatusByZone = { [target.trip.id]: "Closure" };
  const penalized = getRecommendations(prefs, tripZones, fireByZone).find(
    (r) => r.trip.id === target.trip.id
  );
  // Preconditions: the closure pushes it below the 60 floor, and enough
  // other zones still clear 70 that the pool never relaxes to include it.
  assert.ok(penalized && penalized.score < 60);
  assert.ok(ranked.filter((r) => r.trip.id !== target.trip.id && r.score >= 70).length >= 3);

  for (let i = 0; i < 25; i++) {
    const { primary, backups } = getRandomTripRecommendation(prefs, tripZones, fireByZone);
    assert.ok([primary, ...backups].every((r) => r.trip.id !== target.trip.id));
  }
});
