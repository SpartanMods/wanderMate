/**
 * Records real weather.gov and RIDB responses as test fixtures (#28).
 * Uses the same URLs and headers as lib/conditions/weatherGov.ts and ridb.ts.
 *
 * Usage (needs RIDB_API_KEY in the environment):
 *   node scripts/record-conditions-fixtures.mjs
 * In the Claude cloud container, prefix with NODE_USE_ENV_PROXY=1 so Node's
 * fetch uses the egress proxy. The RIDB key is sent as a header and is never
 * written; the script refuses to save a file that contains it.
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../lib/conditions/__fixtures__");

/** Taylor Park zone point (data/tripZones.ts). */
const ZONE = { lat: 38.8388, lng: -106.5784 };
/** Outside NWS coverage: /points answers 404. */
const OUTSIDE_COVERAGE = { lat: 0, lng: 0 };

const NWS_HEADERS = {
  "User-Agent": `WanderMate/1.0 (${process.env.NWS_USER_AGENT_CONTACT || "wandermate@gmail.com"})`,
  Accept: "application/geo+json",
};
const pointsUrl = ({ lat, lng }) => `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`;

const ridbKey = process.env.RIDB_API_KEY;
if (!ridbKey) throw new Error("RIDB_API_KEY is not set");

async function record(file, url, headers) {
  const res = await fetch(url, { headers });
  const body = await res.json();
  const text = JSON.stringify({ _recorded: { at: new Date().toISOString(), url, status: res.status }, response: body }, null, 2) + "\n";
  if (text.includes(ridbKey)) throw new Error(`${file}: response contains the RIDB key; not saving`);
  mkdirSync(dirname(join(OUT_DIR, file)), { recursive: true });
  writeFileSync(join(OUT_DIR, file), text);
  console.log(`${file}: HTTP ${res.status}`);
  return body;
}

const points = await record("weather/points-taylor-park.json", pointsUrl(ZONE), NWS_HEADERS);
await record("weather/forecast-taylor-park.json", points.properties.forecast, NWS_HEADERS);
await record("weather/points-outside-coverage.json", pointsUrl(OUTSIDE_COVERAGE), NWS_HEADERS);

// Same query as fetchNearbyFacilities defaults (radius 50 mi, limit 5, full=true).
await record(
  "ridb/facilities-taylor-park.json",
  `https://ridb.recreation.gov/api/v1/facilities?latitude=${ZONE.lat}&longitude=${ZONE.lng}&radius=50&limit=5&full=true`,
  { apikey: ridbKey, Accept: "application/json" }
);
