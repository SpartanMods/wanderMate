import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWeatherForCoords } from "@/lib/conditions/weatherGov";
import { fetchNearbyFacilities } from "@/lib/conditions/ridb";

test("fetchWeatherForCoords returns null gracefully for coords outside NWS coverage (0, 0)", async () => {
  const result = await fetchWeatherForCoords(0, 0);
  assert.equal(result, null);
});

test("fetchNearbyFacilities returns empty array when RIDB_API_KEY is missing", async () => {
  const original = process.env.RIDB_API_KEY;
  delete process.env.RIDB_API_KEY;
  const result = await fetchNearbyFacilities(39.0, -107.0);
  assert.deepEqual(result, []);
  if (original !== undefined) process.env.RIDB_API_KEY = original;
});
