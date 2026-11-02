import { test } from "node:test";
import assert from "node:assert/strict";
import { fireStatusOf } from "@/lib/conditions/fireStatus";
import { noCoordsConditions } from "@/lib/conditions";
import type { FireRestriction, LiveConditions } from "@/lib/conditions/types";

function conditionsWith(fire: FireRestriction | null): LiveConditions {
  return {
    weather: null,
    fire,
    nearbyFacilities: [],
    fetchedAt: "2026-07-01T00:00:00.000Z",
    hasError: false,
    unavailableReason: null,
  };
}

const NO_RESTRICTION: FireRestriction = {
  hasActiveRestriction: false,
  restrictionLevel: null,
  affectedArea: null,
  sources: ["usfs-psicc"],
  fetchedAt: "2026-07-01T00:00:00.000Z",
};

test("fireStatusOf: missing conditions are unknown", () => {
  assert.equal(fireStatusOf(null), "unknown");
  assert.equal(fireStatusOf(undefined), "unknown");
});

test("fireStatusOf: no coordinates is unknown", () => {
  assert.equal(fireStatusOf(noCoordsConditions()), "unknown");
});

test("fireStatusOf: fire source unavailable is unknown, not none", () => {
  assert.equal(fireStatusOf(conditionsWith(null)), "unknown");
});

test("fireStatusOf: no active restriction is none", () => {
  assert.equal(fireStatusOf(conditionsWith(NO_RESTRICTION)), "none");
});

test("fireStatusOf: active restriction returns its level", () => {
  const level: FireRestriction = {
    ...NO_RESTRICTION,
    hasActiveRestriction: true,
    restrictionLevel: "Stage 2",
  };
  assert.equal(fireStatusOf(conditionsWith(level)), "Stage 2");
});
