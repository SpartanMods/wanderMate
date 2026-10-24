import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLevel, type ParsedFireLevel } from "@/lib/conditions/fireRestrictions";

const level = (l: "Stage 1" | "Stage 2" | "Stage 3" | "Closure"): ParsedFireLevel => ({
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
