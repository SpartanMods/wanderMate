import { test } from "node:test";
import assert from "node:assert/strict";
import { isHiddenByFireFilter, parseFireFilter, serializeFireFilter } from "@/lib/fireFilter";

test("parseFireFilter: missing or empty param hides nothing", () => {
  assert.equal(parseFireFilter(null).size, 0);
  assert.equal(parseFireFilter("").size, 0);
});

test("parseFireFilter: keeps valid values and ignores junk", () => {
  const hidden = parseFireFilter("closure, unknown,bogus,,stage1");
  assert.deepEqual(Array.from(hidden).sort(), ["closure", "stage1", "unknown"]);
});

test("serializeFireFilter: stable option order, round-trips", () => {
  const value = serializeFireFilter(parseFireFilter("unknown,closure"));
  assert.equal(value, "closure,unknown");
  assert.equal(serializeFireFilter(new Set()), "");
});

test("isHiddenByFireFilter: closure option covers Closure and Stage 3", () => {
  const hidden = parseFireFilter("closure");
  assert.equal(isHiddenByFireFilter("Closure", hidden), true);
  assert.equal(isHiddenByFireFilter("Stage 3", hidden), true);
  assert.equal(isHiddenByFireFilter("Stage 2", hidden), false);
});

test("isHiddenByFireFilter: Stage 2 and Stage 2 (partial) are separate options", () => {
  assert.equal(isHiddenByFireFilter("Stage 2 (partial)", parseFireFilter("stage2")), false);
  assert.equal(isHiddenByFireFilter("Stage 2 (partial)", parseFireFilter("stage2-partial")), true);
});

test("isHiddenByFireFilter: none is never hidden; unknown only when chosen", () => {
  const all = parseFireFilter("closure,stage2,stage2-partial,stage1,unknown");
  assert.equal(isHiddenByFireFilter("none", all), false);
  assert.equal(isHiddenByFireFilter("unknown", new Set()), false);
  assert.equal(isHiddenByFireFilter("unknown", all), true);
});
