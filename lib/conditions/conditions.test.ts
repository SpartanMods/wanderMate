import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import tripZones from "@/data/tripZones";
import { fetchWeatherForCoords } from "@/lib/conditions/weatherGov";
import { fetchNearbyFacilities } from "@/lib/conditions/ridb";
import { fetchFireRestrictions } from "@/lib/conditions/fireRestrictions";
import { fetchLiveConditions, noCoordsConditions } from "@/lib/conditions";
import * as fx from "@/lib/conditions/__fixtures__/responses";

// No test in this file may touch the network: every request goes through
// this stub, and an unrouted URL fails the test.
type Route = {
  match: (url: string) => boolean;
  status?: number;
  body?: unknown;
  throws?: boolean;
  /** Respond after this many ms, honoring the request's abort signal. */
  delayMs?: number;
};

function respondAfter(ms: number, response: () => Response, signal?: AbortSignal | null) {
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => resolve(response()), ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

function stubFetch(routes: Route[]) {
  return mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const route = routes.find((r) => r.match(url));
      if (!route) throw new Error(`Unrouted fetch in test: ${url}`);
      if (route.throws) throw new TypeError("fetch failed");
      const response = () =>
        new Response(JSON.stringify(route.body ?? {}), { status: route.status ?? 200 });
      return route.delayMs ? respondAfter(route.delayMs, response, init?.signal) : response();
    }
  );
}

const isPoints = (u: string) => u.includes("api.weather.gov/points/");
const isForecast = (u: string) => u === fx.FORECAST_URL;
const isUsfs = (u: string) => u.includes("apps.fs.usda.gov");
const isBlm = (u: string) => u.includes("gis.blm.gov");
const isRidb = (u: string) => u.includes("ridb.recreation.gov");

const LAT = 39.0;
const LNG = -107.0;

const originalRidbKey = process.env.RIDB_API_KEY;
afterEach(() => {
  mock.restoreAll();
  if (originalRidbKey === undefined) delete process.env.RIDB_API_KEY;
  else process.env.RIDB_API_KEY = originalRidbKey;
});

// --- weather.gov -----------------------------------------------------------

test("weather: points → forecast maps the first period", async () => {
  stubFetch([
    { match: isPoints, body: fx.weatherPoints },
    { match: isForecast, body: fx.weatherForecast },
  ]);
  const result = await fetchWeatherForCoords(LAT, LNG);
  assert.ok(result);
  assert.equal(result.shortForecast, "Mostly Sunny");
  assert.equal(result.temperature, 68);
  assert.equal(result.temperatureUnit, "F");
  assert.equal(result.windSpeed, "5 to 10 mph");
});

test("weather: non-OK points response returns null", async () => {
  stubFetch([{ match: isPoints, status: 404 }]);
  assert.equal(await fetchWeatherForCoords(LAT, LNG), null);
});

test("weather: forecast with no periods returns null", async () => {
  stubFetch([
    { match: isPoints, body: fx.weatherPoints },
    { match: isForecast, body: fx.weatherForecastNoPeriods },
  ]);
  assert.equal(await fetchWeatherForCoords(LAT, LNG), null);
});

test("weather: network error returns null", async () => {
  stubFetch([{ match: isPoints, throws: true }]);
  assert.equal(await fetchWeatherForCoords(LAT, LNG), null);
});

// --- fire restrictions -----------------------------------------------------

test("fire: picks the worst USFS level and its area", async () => {
  stubFetch([
    { match: isUsfs, body: fx.usfsStage2 },
    { match: isBlm, body: fx.blmNone },
  ]);
  const result = await fetchFireRestrictions(LAT, LNG);
  assert.ok(result);
  assert.equal(result.hasActiveRestriction, true);
  assert.equal(result.restrictionLevel, "Stage 2");
  assert.equal(result.affectedArea, "Grand Mesa NF");
  assert.equal(result.source, "usfs");
});

test("fire: no features from either source = no active restriction", async () => {
  stubFetch([
    { match: isUsfs, body: fx.usfsNone },
    { match: isBlm, body: fx.blmNone },
  ]);
  const result = await fetchFireRestrictions(LAT, LNG);
  assert.ok(result);
  assert.equal(result.hasActiveRestriction, false);
  assert.equal(result.restrictionLevel, null);
});

test("fire: unparseable USFS text is unknown, not an all-clear", async () => {
  stubFetch([
    { match: isUsfs, body: fx.usfsUnparseable },
    { match: isBlm, body: fx.blmNone },
  ]);
  assert.equal(await fetchFireRestrictions(LAT, LNG), null);
});

test("fire: BLM is skipped until #11 lands", async () => {
  const fetchMock = stubFetch([
    { match: isUsfs, body: fx.usfsNone },
    { match: isBlm, body: fx.blmNone },
  ]);
  const result = await fetchFireRestrictions(LAT, LNG);
  assert.equal(result?.source, "usfs");
  const blmCalls = fetchMock.mock.calls.filter((c) => isBlm(String(c.arguments[0])));
  assert.equal(blmCalls.length, 0);
});

test("fire: both sources failing returns null", async () => {
  stubFetch([
    { match: isUsfs, throws: true },
    { match: isBlm, status: 503 },
  ]);
  assert.equal(await fetchFireRestrictions(LAT, LNG), null);
});

// --- RIDB --------------------------------------------------------------------

test("ridb: returns empty array when RIDB_API_KEY is missing, without fetching", async () => {
  delete process.env.RIDB_API_KEY;
  const fetchMock = stubFetch([]);
  assert.deepEqual(await fetchNearbyFacilities(LAT, LNG), []);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("ridb: maps facilities from RECDATA", async () => {
  process.env.RIDB_API_KEY = "test-key";
  stubFetch([{ match: isRidb, body: fx.ridbFacilities }]);
  const result = await fetchNearbyFacilities(LAT, LNG);
  assert.equal(result.length, 1);
  assert.equal(result[0].facilityId, "233512");
  assert.equal(result[0].facilityName, "Example Campground");
  assert.equal(result[0].reservable, true);
  assert.equal(result[0].status, "Open");
});

test("ridb: HTTP error returns empty array", async () => {
  process.env.RIDB_API_KEY = "test-key";
  stubFetch([{ match: isRidb, status: 500 }]);
  assert.deepEqual(await fetchNearbyFacilities(LAT, LNG), []);
});

// --- fetchLiveConditions -----------------------------------------------------

test("live conditions: a failing source doesn't block the others", async () => {
  process.env.RIDB_API_KEY = "test-key";
  stubFetch([
    { match: isPoints, throws: true },
    { match: isUsfs, body: fx.usfsStage2 },
    { match: isBlm, body: fx.blmNone },
    { match: isRidb, body: fx.ridbFacilities },
  ]);
  const zone = { ...tripZones[0], coordinates: { lat: LAT, lng: LNG } };
  const result = await fetchLiveConditions(zone);
  assert.equal(result.weather, null);
  assert.equal(result.fire?.restrictionLevel, "Stage 2");
  assert.equal(result.nearbyFacilities.length, 1);
  assert.equal(result.unavailableReason, null);
});

test("live conditions: zone without coordinates makes no requests", async () => {
  const fetchMock = stubFetch([]);
  const zone = { ...tripZones[0], coordinates: undefined };
  const result = await fetchLiveConditions(zone);
  assert.equal(result.weather, null);
  assert.equal(result.fire, null);
  assert.equal(result.unavailableReason, "no_coordinates");
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("noCoordsConditions: fresh object and current timestamp per call", async () => {
  const first = noCoordsConditions();
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = noCoordsConditions();
  assert.notEqual(first, second);
  assert.notEqual(first.fetchedAt, second.fetchedAt);
});

// --- timeouts ----------------------------------------------------------------

const TEST_TIMEOUT_MS = 40;

test("timeout: weather's two calls share one budget", async () => {
  // Each call alone fits in the budget; together they exceed it.
  stubFetch([
    { match: isPoints, body: fx.weatherPoints, delayMs: 25 },
    { match: isForecast, body: fx.weatherForecast, delayMs: 25 },
  ]);
  assert.equal(await fetchWeatherForCoords(LAT, LNG, TEST_TIMEOUT_MS), null);
});

test("timeout: weather within the shared budget succeeds", async () => {
  stubFetch([
    { match: isPoints, body: fx.weatherPoints, delayMs: 5 },
    { match: isForecast, body: fx.weatherForecast, delayMs: 5 },
  ]);
  const result = await fetchWeatherForCoords(LAT, LNG, TEST_TIMEOUT_MS);
  assert.equal(result?.shortForecast, "Mostly Sunny");
});

test("timeout: a hung USFS request becomes unknown (null)", async () => {
  stubFetch([{ match: isUsfs, body: fx.usfsStage2, delayMs: 10_000 }]);
  const started = Date.now();
  assert.equal(await fetchFireRestrictions(LAT, LNG, TEST_TIMEOUT_MS), null);
  assert.ok(Date.now() - started < 1_000, "should give up at the timeout, not wait for the response");
});

test("timeout: a hung RIDB request returns an empty list", async () => {
  process.env.RIDB_API_KEY = "test-key";
  stubFetch([{ match: isRidb, body: fx.ridbFacilities, delayMs: 10_000 }]);
  assert.deepEqual(await fetchNearbyFacilities(LAT, LNG, 50, 5, TEST_TIMEOUT_MS), []);
});
