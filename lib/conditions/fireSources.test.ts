import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import tripZones from "@/data/tripZones";
import {
  BLM_RMA_SOURCE,
  FIRE_SEARCH_RADIUS_MILES,
  USFS_PSICC_SOURCE,
  UTAH_FFSL_SOURCE,
  buildQueryUrl,
  interpretResponse,
  type FireSource,
  type SourceAnswer,
} from "@/lib/conditions/fireSources";
import { FIRE_COVERAGE } from "@/lib/conditions/fireCoverage";
import { combineAnswers } from "@/lib/conditions/fireRestrictions";

// Real responses recorded by scripts/record-fire-fixtures.mjs (2026-11-02).
// They were recorded with an 80 mi radius, so they hold more features than a
// 10 mi query would; interpretation doesn't depend on the radius.
function recorded(name: string): { response: unknown } {
  const path = new URL(`./__fixtures__/fire/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(path, "utf8"));
}

const UNKNOWN: SourceAnswer = { kind: "unknown" };
const CLEAR: SourceAnswer = { kind: "clear" };

/** Wraps attribute rows in an ArcGIS query body. */
const body = (...rows: Record<string, unknown>[]) => ({
  features: rows.map((attributes) => ({ attributes })),
});

// --- recorded responses --------------------------------------------------------

test("BLM-RMA (recorded, Newcastle WY): Stage 1 field office wins over Year Round", () => {
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, recorded("blm-rma-stage1-newcastle-wy").response), {
    kind: "restriction",
    level: "Stage 1",
    area: "Newcastle Field Office, Crook County",
  });
});

test("BLM-RMA (recorded, Rabbit Valley): only Year Round rules = clear", () => {
  const fixture = recorded("blm-rma-year-round-rabbit-valley").response;
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, fixture), CLEAR);
});

test("Utah FFSL (recorded, West Desert): Closure outranks Stage 1 and prevention orders", () => {
  assert.deepEqual(interpretResponse(UTAH_FFSL_SOURCE, recorded("utah-ffsl-stage1-west-desert").response), {
    kind: "restriction",
    level: "Closure",
    area: "Forest Service (USFS) - Cottonwood Fire Closure",
  });
});

test("Utah FFSL: prevention orders alone are clear", () => {
  const fixture = recorded("utah-ffsl-capitol-reef").response as { features: { attributes: { RestrictionType: string } }[] };
  const preventionOnly = {
    ...fixture,
    features: fixture.features.filter((f) => f.attributes.RestrictionType === "Prevention Order"),
  };
  assert.equal(preventionOnly.features.length, 1);
  assert.deepEqual(interpretResponse(UTAH_FFSL_SOURCE, preventionOnly), CLEAR);
});

test("USFS PSICC (recorded): code '1' is No Restrictions, not Stage 1", () => {
  assert.deepEqual(interpretResponse(USFS_PSICC_SOURCE, recorded("usfs-psicc-buena-vista").response), CLEAR);
});

test("USFS PSICC: codes '2' / '3' map to Stage 1 / Stage 2", () => {
  const district = { DISTRICTNA: "Salida Ranger District", FORESTNAME: "San Isabel National Forest" };
  assert.deepEqual(
    interpretResponse(USFS_PSICC_SOURCE, body({ ...district, FireRestct: "2" }, { ...district, FireRestct: "3" })),
    { kind: "restriction", level: "Stage 2", area: "Salida Ranger District, San Isabel National Forest" }
  );
});

// --- validation: a mismatch is unknown, never clear ------------------------------

const blmRow = { restriction_status: "Year Round", admin_unit_nm: "X", county_name: "Y", state: "Colorado" };

test("validation: ArcGIS error body is unknown", () => {
  const error = { error: { code: 400, message: "Invalid query parameters", details: [] } };
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, error), UNKNOWN);
});

test("validation: a missing requested field is unknown", () => {
  const { restriction_status: _dropped, ...withoutStatus } = blmRow;
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, body(withoutStatus)), UNKNOWN);
});

test("validation: an unexpected coded value is unknown", () => {
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, body({ ...blmRow, restriction_status: "Stage 4" })), UNKNOWN);
  assert.deepEqual(
    interpretResponse(USFS_PSICC_SOURCE, body({ FireRestct: "4", DISTRICTNA: null, FORESTNAME: null })),
    UNKNOWN
  );
});

test("validation: a non-active Utah order slipping past the filter is unknown", () => {
  const row = { RestrictionType: "Stage 1", Status: "Rescinded", Agency: null, Short_AreaDescription: null };
  assert.deepEqual(interpretResponse(UTAH_FFSL_SOURCE, body(row)), UNKNOWN);
});

test("validation: truncated results are unknown", () => {
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, { ...body(blmRow), exceededTransferLimit: true }), UNKNOWN);
});

test("null status: unknown unless another feature is a restriction", () => {
  const unreadable = { ...blmRow, restriction_status: null };
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, body(blmRow, unreadable)), UNKNOWN);
  const stage1 = { ...blmRow, restriction_status: "Stage 1" };
  assert.equal(interpretResponse(BLM_RMA_SOURCE, body(unreadable, stage1)).kind, "restriction");
});

test("no features: unknown for blanket layers, clear for order-only layers", () => {
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, body()), UNKNOWN);
  assert.deepEqual(interpretResponse(USFS_PSICC_SOURCE, body()), UNKNOWN);
  assert.deepEqual(interpretResponse(UTAH_FFSL_SOURCE, body()), CLEAR);
});

// --- query URL -----------------------------------------------------------------

test("buildQueryUrl: requests exactly the validated fields within the radius", () => {
  const sources: FireSource<unknown>[] = [BLM_RMA_SOURCE, UTAH_FFSL_SOURCE, USFS_PSICC_SOURCE];
  for (const source of sources) {
    const url = new URL(buildQueryUrl(source, 39.1, -108.5));
    assert.equal(url.searchParams.get("outFields"), source.outFields.join(","));
    assert.equal(url.searchParams.get("where"), source.where);
    assert.equal(url.searchParams.get("distance"), String(FIRE_SEARCH_RADIUS_MILES));
    assert.equal(url.searchParams.get("returnGeometry"), "false");
  }
});

// --- coverage + combining --------------------------------------------------------

test("coverage: every zone has an explicit entry", () => {
  const missing = tripZones.filter((z) => !(z.id in FIRE_COVERAGE)).map((z) => z.id);
  assert.deepEqual(missing, []);
});

const AT = "2026-11-02T00:00:00.000Z";
const stage = (level: "Stage 1" | "Stage 2"): SourceAnswer => ({ kind: "restriction", level, area: "Area" });

test("combine: the worst restriction wins and names its source", () => {
  const result = combineAnswers(
    [
      { id: "utah-ffsl", answer: stage("Stage 1") },
      { id: "blm-rma", answer: stage("Stage 2") },
    ],
    { complete: true },
    AT
  );
  assert.equal(result?.restrictionLevel, "Stage 2");
  assert.deepEqual(result?.sources, ["blm-rma"]);
});

test("combine: a restriction shows even with incomplete coverage or a failed source", () => {
  const result = combineAnswers(
    [
      { id: "usfs-psicc", answer: UNKNOWN },
      { id: "blm-rma", answer: stage("Stage 1") },
    ],
    { complete: false },
    AT
  );
  assert.equal(result?.hasActiveRestriction, true);
});

test("combine: 'none' needs complete coverage and every source clear", () => {
  const allClear = [
    { id: "usfs-psicc" as const, answer: CLEAR },
    { id: "blm-rma" as const, answer: CLEAR },
  ];
  const none = combineAnswers(allClear, { complete: true }, AT);
  assert.equal(none?.hasActiveRestriction, false);
  assert.deepEqual(none?.sources, ["usfs-psicc", "blm-rma"]);

  assert.equal(combineAnswers(allClear, { complete: false }, AT), null);
  assert.equal(
    combineAnswers([{ id: "usfs-psicc", answer: CLEAR }, { id: "blm-rma", answer: UNKNOWN }], { complete: true }, AT),
    null
  );
  assert.equal(combineAnswers([], { complete: true }, AT), null);
});
