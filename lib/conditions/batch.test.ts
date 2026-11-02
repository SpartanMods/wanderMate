import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import tripZones from "@/data/tripZones";
import { fetchConditionsForZones, isDegraded, parseZoneIds } from "@/lib/conditions/batch";
import { noCoordsConditions } from "@/lib/conditions";
import type { LiveConditions } from "@/lib/conditions/types";

afterEach(() => mock.restoreAll());

const [a, b] = tripZones;

test("parseZoneIds: keeps known ids once, in order, ignores junk", () => {
  const zones = parseZoneIds(` ${b.id},nope,${a.id},${b.id},`, tripZones);
  assert.deepEqual(zones.map((z) => z.id), [b.id, a.id]);
  assert.deepEqual(parseZoneIds(null, tripZones), []);
});

test("fetchConditionsForZones: every zone returns even when all upstreams fail", async () => {
  mock.method(globalThis, "fetch", async () => {
    throw new TypeError("fetch failed");
  });
  const zones = [a, { ...b, coordinates: undefined }];
  const result = await fetchConditionsForZones(zones);
  assert.deepEqual(Object.keys(result).sort(), [a.id, b.id].sort());
  assert.equal(result[a.id].fire, null);
  assert.equal(result[b.id].unavailableReason, "no_coordinates");
});

const withFire = (fire: LiveConditions["fire"]): LiveConditions => ({
  ...noCoordsConditions(),
  unavailableReason: null,
  fire,
});
const NO_RESTRICTION: LiveConditions["fire"] = {
  hasActiveRestriction: false,
  restrictionLevel: null,
  affectedArea: null,
  sources: ["usfs-psicc"],
  fetchedAt: "x",
};

test("isDegraded: complete data and no-coordinates zones are not degraded", () => {
  assert.equal(isDegraded([a, b], { [a.id]: withFire(NO_RESTRICTION), [b.id]: noCoordsConditions() }), false);
});

test("isDegraded: a failed fire lookup or a missing zone is degraded", () => {
  assert.equal(isDegraded([a, b], { [a.id]: withFire(NO_RESTRICTION), [b.id]: withFire(null) }), true);
  assert.equal(isDegraded([a, b], { [a.id]: withFire(NO_RESTRICTION) }), true);
});
