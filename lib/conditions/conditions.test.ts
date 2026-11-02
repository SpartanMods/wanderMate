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
const isPsicc = (u: string) => u.includes("PSICCRangerDistrictsFireRestrictions");
const isBlmRma = (u: string) => u.includes("Rocky_Mountain_Area_BLM_Fire_Restriction");
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

/** A Colorado zone covered by both PSICC (USFS) and BLM-RMA, coverage complete. */
const FIRE_ZONE = "buena-vista-fourmile";

const psiccRow = (FireRestct: string) => ({
  features: [{ attributes: { FireRestct, DISTRICTNA: "Salida Ranger District", FORESTNAME: "San Isabel National Forest" } }],
});
const blmRow = (restriction_status: string) => ({
  features: [
    { attributes: { restriction_status, admin_unit_nm: "Royal Gorge Field Office", county_name: "Chaffee County", state: "Colorado" } },
  ],
});

test("fire: a Stage 2 district beats a clear BLM unit", async () => {
  stubFetch([
    { match: isPsicc, body: psiccRow("3") },
    { match: isBlmRma, body: blmRow("Year Round") },
  ]);
  const result = await fetchFireRestrictions(FIRE_ZONE, LAT, LNG);
  assert.ok(result);
  assert.equal(result.hasActiveRestriction, true);
  assert.equal(result.restrictionLevel, "Stage 2");
  assert.equal(result.affectedArea, "Salida Ranger District, San Isabel National Forest");
  assert.deepEqual(result.sources, ["usfs-psicc"]);
});

test("fire: every source clear on a fully covered zone = no restriction", async () => {
  stubFetch([
    { match: isPsicc, body: psiccRow("1") },
    { match: isBlmRma, body: blmRow("Year Round") },
  ]);
  const result = await fetchFireRestrictions(FIRE_ZONE, LAT, LNG);
  assert.ok(result);
  assert.equal(result.hasActiveRestriction, false);
  assert.deepEqual(result.sources, ["usfs-psicc", "blm-rma"]);
});

test("fire: one source failing makes a clear zone unknown", async () => {
  stubFetch([
    { match: isPsicc, body: psiccRow("1") },
    { match: isBlmRma, status: 503 },
  ]);
  assert.equal(await fetchFireRestrictions(FIRE_ZONE, LAT, LNG), null);
});

test("fire: schema mismatch is unknown, not an all-clear", async () => {
  stubFetch([
    { match: isPsicc, body: { features: [{ attributes: { STAGE: "1" } }] } },
    { match: isBlmRma, body: blmRow("Year Round") },
  ]);
  assert.equal(await fetchFireRestrictions(FIRE_ZONE, LAT, LNG), null);
});

test("fire: incomplete coverage is unknown even when sources are clear", async () => {
  stubFetch([{ match: isBlmRma, body: blmRow("Year Round") }]);
  assert.equal(await fetchFireRestrictions("walden-north-park", LAT, LNG), null);
});

test("fire: zones without a source make no requests", async () => {
  const fetchMock = stubFetch([]);
  assert.equal(await fetchFireRestrictions("flat-tops", LAT, LNG), null);
  assert.equal(await fetchFireRestrictions("not-a-zone", LAT, LNG), null);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("fire: network errors on every source return null", async () => {
  stubFetch([
    { match: isPsicc, throws: true },
    { match: isBlmRma, throws: true },
  ]);
  assert.equal(await fetchFireRestrictions(FIRE_ZONE, LAT, LNG), null);
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
    { match: isPsicc, body: psiccRow("3") },
    { match: isBlmRma, body: blmRow("Year Round") },
    { match: isRidb, body: fx.ridbFacilities },
  ]);
  const base = tripZones.find((z) => z.id === FIRE_ZONE);
  assert.ok(base);
  const zone = { ...base, coordinates: { lat: LAT, lng: LNG } };
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

test("timeout: a hung fire source becomes unknown (null)", async () => {
  stubFetch([
    { match: isPsicc, body: psiccRow("1"), delayMs: 10_000 },
    { match: isBlmRma, body: blmRow("Year Round") },
  ]);
  const started = Date.now();
  assert.equal(await fetchFireRestrictions(FIRE_ZONE, LAT, LNG, TEST_TIMEOUT_MS), null);
  assert.ok(Date.now() - started < 1_000, "should give up at the timeout, not wait for the response");
});

test("timeout: a hung RIDB request returns an empty list", async () => {
  process.env.RIDB_API_KEY = "test-key";
  stubFetch([{ match: isRidb, body: fx.ridbFacilities, delayMs: 10_000 }]);
  assert.deepEqual(await fetchNearbyFacilities(LAT, LNG, 50, 5, TEST_TIMEOUT_MS), []);
});
