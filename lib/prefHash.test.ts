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

function encodeRaw(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

test("decodePrefs returns null for valid JSON with an empty object", () => {
  assert.equal(decodePrefs(encodeRaw({})), null);
});

test("decodePrefs returns null when a field has the wrong type", () => {
  assert.equal(decodePrefs(encodeRaw({ ...sample, selectedActivities: "x" })), null);
  assert.equal(decodePrefs(encodeRaw({ ...sample, maxDriveTimeHours: "3" })), null);
});

test("decodePrefs returns null when a required field is missing", () => {
  const { experienceLevel: _omit, ...rest } = sample;
  assert.equal(decodePrefs(encodeRaw(rest)), null);
});

test("decodePrefs returns null for out-of-range values", () => {
  assert.equal(decodePrefs(encodeRaw({ ...sample, crowdTolerance: 9 })), null);
});

test("decodePrefs drops unknown extra fields", () => {
  const decoded = decodePrefs(encodeRaw({ ...sample, injected: "<script>" }));
  assert.deepEqual(decoded, sample);
});

test("decodePrefs returns null for non-object JSON", () => {
  assert.equal(decodePrefs(encodeRaw("hello")), null);
  assert.equal(decodePrefs(encodeRaw(null)), null);
});

test("decodePrefs returns null for an unknown activity", () => {
  const crafted = {
    ...sample,
    selectedActivities: { ...sample.selectedActivities, bogusKey: "must_have" },
  };
  assert.equal(decodePrefs(encodeRaw(crafted)), null);
});
