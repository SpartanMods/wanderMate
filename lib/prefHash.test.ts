import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePrefs, decodePrefs } from "@/lib/prefHash";
import type { TripPreferences } from "@/lib/types";

const sample: TripPreferences = {
  startingLocation: "Denver, CO",
  maxDriveTimeHours: 3,
  startDate: "2026-07-04",
  selectedActivities: { hiking: "must_have", fishing: "nice_to_have" },
  experienceLevel: "intermediate",
  offGridPreference: 2,
  crowdTolerance: 3,
  vehicleCapability: "suv",
  campingPreference: "dispersed",
  riskTolerance: 2,
  vibes: ["Forest", "Remote and quiet"],
  mustAvoid: ["Crowds"],
  gear: ["Tent"],
};

test("encodePrefs produces a non-empty string", () => {
  const encoded = encodePrefs(sample);
  assert.ok(typeof encoded === "string" && encoded.length > 0);
});

test("decodePrefs round-trips TripPreferences", () => {
  const encoded = encodePrefs(sample);
  const decoded = decodePrefs(encoded);
  assert.deepEqual(decoded, sample);
});

test("decodePrefs returns null for garbage input", () => {
  assert.equal(decodePrefs("not-valid-base64!!!"), null);
});

test("encodePrefs produces URL-safe characters only", () => {
  const encoded = encodePrefs(sample);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
});
