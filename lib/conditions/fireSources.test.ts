import { test } from "node:test";
import assert from "node:assert/strict";
import tripZones from "@/data/tripZones";
import {
  BLM_RMA_SOURCE,
  FIRE_SEARCH_RADIUS_MILES,
  USFS_PSICC_SOURCE,
  UTAH_FFSL_SOURCE,
  buildQueryUrl,
  interpretResponse,
  todayForFireOrders,
  unknownAnswer,
  type FireSource,
  type SourceAnswer,
} from "@/lib/conditions/fireSources";
import { FIRE_COVERAGE } from "@/lib/conditions/fireCoverage";
import { combineAnswers } from "@/lib/conditions/fireRestrictions";
import { recorded } from "@/lib/conditions/__fixtures__/responses";

// Real responses recorded by scripts/record-fire-fixtures.mjs (2026-11-02),
// using the same query (10 mi radius) the app sends.
type ArcgisBody = { features: { attributes: Record<string, unknown> }[] };

const fireFixture = (name: string): ArcgisBody => recorded<ArcgisBody>(`fire/${name}.json`).response;

/** Date the fixtures were recorded; Davis County's recurring season had ended. */
const RECORDED_ON = "2026-11-02";
const IN_RECURRING_SEASON = "2026-07-01";

const FAILED = unknownAnswer("failed");
const CLEAR: SourceAnswer = { kind: "clear" };

/** Wraps attribute rows in an ArcGIS query body. */
const body = (...rows: Record<string, unknown>[]) => ({
  features: rows.map((attributes) => ({ attributes })),
});

// --- recorded responses --------------------------------------------------------

test("BLM-RMA (recorded, Newcastle WY): Stage 1 field office", () => {
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, fireFixture("blm-rma-stage1-newcastle-wy")), {
    kind: "restriction",
    level: "Stage 1",
    area: "Newcastle Field Office, Weston County",
  });
});

test("BLM-RMA (recorded, Rabbit Valley): only Year Round rules = clear", () => {
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, fireFixture("blm-rma-year-round-rabbit-valley")), CLEAR);
});

test("Utah FFSL (recorded, Farmington): active Stage 1 wins; out-of-season recurring orders don't count", () => {
  assert.deepEqual(
    interpretResponse(UTAH_FFSL_SOURCE, fireFixture("utah-ffsl-stage1-recurring-farmington"), RECORDED_ON),
    { kind: "restriction", level: "Stage 1", area: "Bureau of Land Management (BLM) - West Desert District" }
  );
});

test("Utah FFSL (recorded, Capitol Reef): prevention and standing special orders are clear", () => {
  assert.deepEqual(interpretResponse(UTAH_FFSL_SOURCE, fireFixture("utah-ffsl-capitol-reef"), RECORDED_ON), CLEAR);
});

/** The Farmington fixture's recurring rows, re-typed as a Stage 2 order. */
function recurringStage2(): ArcgisBody {
  const fixture = fireFixture("utah-ffsl-stage1-recurring-farmington");
  const recurring = fixture.features.filter((f) => f.attributes.Status === "Recurring");
  assert.ok(recurring.length > 0);
  return { ...fixture, features: recurring.map((f) => ({ attributes: { ...f.attributes, RestrictionType: "Stage 2" } })) };
}

test("Utah FFSL: a recurring order counts only inside its date window", () => {
  assert.deepEqual(interpretResponse(UTAH_FFSL_SOURCE, recurringStage2(), RECORDED_ON), CLEAR);
  assert.equal(
    interpretResponse(UTAH_FFSL_SOURCE, recurringStage2(), IN_RECURRING_SEASON).kind,
    "restriction"
  );
});

test("Utah FFSL: a recurring order without dates is unreadable, so unknown", () => {
  const body = recurringStage2();
  body.features = body.features.map((f) => ({ attributes: { ...f.attributes, RescindedDate: null } }));
  assert.deepEqual(interpretResponse(UTAH_FFSL_SOURCE, body, RECORDED_ON), unknownAnswer("unreadable"));
});

test("Utah FFSL: orders scheduled to end later are still in force", () => {
  const body = recurringStage2();
  for (const status of ["Future_Rescind", "Future_Supersede"]) {
    const scheduled = { features: body.features.map((f) => ({ attributes: { ...f.attributes, Status: status } })) };
    assert.equal(interpretResponse(UTAH_FFSL_SOURCE, scheduled, RECORDED_ON).kind, "restriction");
  }
});

test("Utah FFSL: the query asks for every in-force status", () => {
  const where = new URL(buildQueryUrl(UTAH_FFSL_SOURCE, 40, -111)).searchParams.get("where");
  for (const status of ["Active", "Standing", "Future_Rescind", "Future_Supersede", "Recurring"]) {
    assert.ok(where?.includes(`'${status}'`), status);
  }
  assert.ok(!where?.includes("'Future'"), "orders not yet effective are excluded");
});

test("todayForFireOrders: Mountain-time calendar date", () => {
  // 03:00 UTC on Nov 2 is still Nov 1 in Denver.
  assert.equal(todayForFireOrders(new Date("2026-11-02T03:00:00Z")), "2026-11-01");
});

test("USFS PSICC (recorded): code '1' is No Restrictions, not Stage 1", () => {
  assert.deepEqual(interpretResponse(USFS_PSICC_SOURCE, fireFixture("usfs-psicc-buena-vista")), CLEAR);
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

test("validation: an ArcGIS error body is a failure", () => {
  const transient = { error: { code: 500, message: "Internal error", details: [] } };
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, transient), FAILED);
});

test("validation: ArcGIS 400 (stale URL or fields) is a failure logged as a config error", (t) => {
  const errorLog = t.mock.method(console, "error", () => {});
  const staleUrl = { error: { code: 400, message: "Invalid URL", details: ["Invalid URL"] } };
  assert.deepEqual(interpretResponse(USFS_PSICC_SOURCE, staleUrl), FAILED);
  assert.equal(errorLog.mock.callCount(), 1);
  assert.match(String(errorLog.mock.calls[0].arguments[0]), /usfs-psicc.*out of date/);
});

test("validation: a missing requested field is unknown", () => {
  const { restriction_status: _dropped, ...withoutStatus } = blmRow;
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, body(withoutStatus)), FAILED);
});

test("validation: an unexpected coded value is unknown", () => {
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, body({ ...blmRow, restriction_status: "Stage 4" })), FAILED);
  assert.deepEqual(
    interpretResponse(USFS_PSICC_SOURCE, body({ FireRestct: "4", DISTRICTNA: null, FORESTNAME: null })),
    FAILED
  );
});

test("validation: a rescinded Utah order slipping past the filter is a failure", () => {
  const row = {
    RestrictionType: "Stage 1",
    Status: "Rescinded",
    EffectiveDate: null,
    RescindedDate: null,
    Agency: null,
    Short_AreaDescription: null,
  };
  assert.deepEqual(interpretResponse(UTAH_FFSL_SOURCE, body(row)), FAILED);
});

test("validation: truncated results are unknown", () => {
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, { ...body(blmRow), exceededTransferLimit: true }), FAILED);
});

test("null status: unknown unless another feature is a restriction", () => {
  const unreadable = { ...blmRow, restriction_status: null };
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, body(blmRow, unreadable)), unknownAnswer("unreadable"));
  const stage1 = { ...blmRow, restriction_status: "Stage 1" };
  assert.equal(interpretResponse(BLM_RMA_SOURCE, body(unreadable, stage1)).kind, "restriction");
});

test("no features: unknown for blanket layers, clear for order-only layers", () => {
  assert.deepEqual(interpretResponse(BLM_RMA_SOURCE, body()), unknownAnswer("not_covered"));
  assert.deepEqual(interpretResponse(USFS_PSICC_SOURCE, body()), unknownAnswer("not_covered"));
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
      { id: "usfs-psicc", answer: FAILED },
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
    combineAnswers([{ id: "usfs-psicc", answer: CLEAR }, { id: "blm-rma", answer: FAILED }], { complete: true }, AT),
    null
  );
  assert.equal(combineAnswers([], { complete: true }, AT), null);
});
