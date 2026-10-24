import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLevel, type ParsedFireLevel } from "@/lib/conditions/fireRestrictions";
import type { FireLevel } from "@/lib/conditions/types";

const level = (l: FireLevel): ParsedFireLevel => ({
  kind: "level",
  level: l,
});
const NONE: ParsedFireLevel = { kind: "none" };
const UNKNOWN: ParsedFireLevel = { kind: "unknown" };

const cases: [string | null | undefined, ParsedFireLevel][] = [
  // Explicit stage phrases in digit / roman / word form.
  ["Stage 1", level("Stage 1")],
  ["Stage 1 Fire Restrictions", level("Stage 1")],
  ["STAGE-2", level("Stage 2")],
  ["stage ii", level("Stage 2")],
  ["Stage II", level("Stage 2")],
  ["Stage Two", level("Stage 2")],
  ["Stage 3", level("Stage 3")],
  ["Stage 1 and Stage 2 areas", level("Stage 2")],
  // Digits outside a stage phrase must not influence the result.
  ["Stage 1 — effective 06/21", level("Stage 1")],
  ["Region 2 Order 2026-14", UNKNOWN],
  ["Order 12", UNKNOWN],
  // Closure language is most severe.
  ["Area Closure", level("Closure")],
  ["Full fire ban in effect", level("Closure")],
  // Lifted / none / advisory-only = no active restriction.
  ["Stage 1 lifted", NONE],
  ["Lifted 10/01", NONE],
  ["Restrictions rescinded", NONE],
  ["No restrictions", NONE],
  ["None", NONE],
  ["Fire Prevention", NONE],
  // "Lifted" only cancels the same stage; a different active stage remains.
  ["Stage 2 in effect; Stage 1 lifted", level("Stage 2")],
  ["Stage 2 lifted, Stage 1 in effect", level("Stage 1")],
  ["Stage 1 in effect. Stage 1 lifted 10/01", NONE],
  ["Closure lifted", NONE],
  // Stage 2 with an exemption is its own, less severe level.
  ["Stage 2 - no restrictions on gas stoves", level("Stage 2 (partial)")],
  ["Stage 2; no restrictions for pressurized stoves", level("Stage 2 (partial)")],
  ["Stage 1 - no restrictions on gas stoves", level("Stage 1")],
  // Accepted: "closed" in a Stage 1 order reads as Closure.
  ["Stage 1: campgrounds closed to campfires", level("Closure")],
  // An explicit stage beats advisory wording.
  ["Fire Prevention Order: Stage 1", level("Stage 1")],
  // Empty / missing input is unknown.
  ["", UNKNOWN],
  ["   ", UNKNOWN],
  [null, UNKNOWN],
  [undefined, UNKNOWN],
];

for (const [input, expected] of cases) {
  test(`parseLevel(${JSON.stringify(input)})`, () => {
    assert.deepEqual(parseLevel(input), expected);
  });
}
