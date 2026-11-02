// Upstream responses for the conditions tests (test-only; never imported by app code).
//
// Recorded: real responses saved by scripts/record-conditions-fixtures.mjs
// (weather.gov, RIDB) and scripts/record-fire-fixtures.mjs (fire layers), each
// with its request URL and HTTP status. Synthetic: edge cases that can't be
// recorded on demand, marked below.
import { readFileSync } from "node:fs";

export type RecordedResponse<T = unknown> = {
  _recorded: { at: string; url: string; status?: number };
  response: T;
};

/** Loads a recorded fixture by its path under __fixtures__/. */
export function recorded<T = unknown>(path: string): RecordedResponse<T> {
  return JSON.parse(readFileSync(new URL(`./${path}`, import.meta.url), "utf8"));
}

// --- weather.gov (recorded 2026-11-02, Taylor Park zone point) -----------------

type PointsBody = { properties: { forecast: string } };

export const weatherPoints = recorded<PointsBody>("weather/points-taylor-park.json").response;
export const FORECAST_URL = weatherPoints.properties.forecast;
export const weatherForecast = recorded("weather/forecast-taylor-park.json").response;
/** Real 404 for a point outside NWS coverage (0,0). */
export const weatherPointsOutsideCoverage = recorded("weather/points-outside-coverage.json");

// --- RIDB (recorded 2026-11-02, 50 mi around Taylor Park) -----------------------

export const ridbFacilities = recorded("ridb/facilities-taylor-park.json").response;

// --- Synthetic edge cases ---------------------------------------------------------

/** A forecast with no periods (not reproducible on demand). */
export const weatherForecastNoPeriods = { properties: { periods: [] } };
