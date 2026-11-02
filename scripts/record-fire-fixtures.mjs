/**
 * Records real fire-restriction query responses as test fixtures (#11, #28).
 * Uses the same query URLs as the adapters, so fixtures match what runs live.
 *
 * Usage:
 *   node --import ./scripts/register-loader.mjs scripts/record-fire-fixtures.mjs
 * In the Claude cloud container, prefix with NODE_USE_ENV_PROXY=1 so Node's
 * fetch uses the egress proxy. No API keys are involved.
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { FIRE_SOURCES, buildQueryUrl } from "../lib/conditions/fireSources.ts";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../lib/conditions/__fixtures__/fire");

/** name → source + a point chosen for the case it demonstrates. */
const CASES = {
  "blm-rma-stage1-newcastle-wy": { source: "blm-rma", lat: 43.85, lng: -104.2 },
  "blm-rma-year-round-rabbit-valley": { source: "blm-rma", lat: 39.1725, lng: -109.0221 },
  "utah-ffsl-stage1-west-desert": { source: "utah-ffsl", lat: 39.35, lng: -112.58 },
  "utah-ffsl-capitol-reef": { source: "utah-ffsl", lat: 38.067, lng: -111.1553 },
  "usfs-psicc-buena-vista": { source: "usfs-psicc", lat: 38.8422, lng: -106.1311 },
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, { source, lat, lng }] of Object.entries(CASES)) {
  const url = buildQueryUrl(FIRE_SOURCES[source], lat, lng);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const body = await res.json();
  const fixture = {
    _recorded: { at: new Date().toISOString(), source, lat, lng, url },
    response: body,
  };
  writeFileSync(join(OUT_DIR, `${name}.json`), JSON.stringify(fixture, null, 2) + "\n");
  console.log(`${name}: ${body.features?.length ?? "no"} features`);
}
