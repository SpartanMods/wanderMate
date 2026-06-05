/**
 * Geocodes all zones in data/tripZones.ts using Nominatim (OpenStreetMap).
 * No API key required. Rate-limited to 1 req/sec per OSM policy.
 *
 * Usage:
 *   node scripts/geocode-zones.mjs
 *   node scripts/geocode-zones.mjs --dry-run   (print results, don't patch file)
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");
const UA = "WanderMate/1.0 geocode-zones-script (contact@wandermate.app)";

// Manual overrides for zones where Nominatim needs a nudge.
// Key = zone id, value = search query to use instead of default.
const QUERY_OVERRIDES = {
  "taylor-park":          "Taylor Park Reservoir, Gunnison County, Colorado",
  "flat-tops":            "Flat Tops Wilderness, Colorado",
  "vedauwoo":             "Vedauwoo, Laramie County, Wyoming",
  "flaming-gorge":        "Flaming Gorge Reservoir, Utah",
  "san-rafael-swell":     "San Rafael Swell, Emery County, Utah",
  "capitol-reef-area":    "Capitol Reef National Park, Utah",
  "uncompahgre-plateau":  "Uncompahgre National Forest, Colorado",
  "buena-vista-fourmile": "Buena Vista, Chaffee County, Colorado",
  "walden-north-park":    "Walden, Jackson County, Colorado",
  "arkansas-river-valley":"Salida, Chaffee County, Colorado",
  "gunnison-hartman":     "Gunnison, Colorado",
  "rabbit-valley":        "Rabbit Valley, Mesa County, Colorado",
  "dinosaur-browns-park": "Dinosaur National Monument, Colorado",
  "manti-la-sal":         "La Sal, San Juan County, Utah",
  "fishlake-national-forest": "Fish Lake, Sevier County, Utah",
  "uinta-mountains":      "Uinta Mountains, Utah",
  "red-feather-lakes":    "Red Feather Lakes, Larimer County, Colorado",
  "south-park-eleven-mile": "South Park, Park County, Colorado",
  "book-cliffs":          "Book Cliffs, Utah",
};

// Hardcoded fallbacks for zones that Nominatim consistently misses
const COORD_FALLBACKS = {
  // Book Cliffs — large escarpment along UT/CO border, eastern Utah center
  "book-cliffs": { lat: 39.3012, lng: -109.7543 },
};

function buildQuery(zone) {
  if (QUERY_OVERRIDES[zone.id]) return QUERY_OVERRIDES[zone.id];
  return `${zone.name}, ${zone.state}`;
}

async function geocode(query) {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for "${query}"`);
  const data = await res.json();
  if (!data.length) return null;
  return {
    lat: parseFloat(parseFloat(data[0].lat).toFixed(4)),
    lng: parseFloat(parseFloat(data[0].lon).toFixed(4)),
    display: data[0].display_name,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- Main ----

// Load zone IDs/names/states dynamically via the register-loader
const { default: zones } = await import("../data/tripZones.ts");

const results = [];
console.log(`Geocoding ${zones.length} zones via Nominatim...\n`);

for (const zone of zones) {
  const query = buildQuery(zone);
  process.stdout.write(`  ${zone.id.padEnd(30)} "${query}" ... `);
  try {
    let coords = await geocode(query);
    if (!coords && COORD_FALLBACKS[zone.id]) {
      coords = { ...COORD_FALLBACKS[zone.id], display: "hardcoded fallback" };
    }
    if (coords) {
      const tag = coords.display === "hardcoded fallback" ? "(fallback)" : "";
      console.log(`✓  ${coords.lat}, ${coords.lng} ${tag}`);
      results.push({ id: zone.id, coords });
    } else {
      console.log("✗  no result");
      results.push({ id: zone.id, coords: null });
    }
  } catch (err) {
    console.log(`✗  error: ${err.message}`);
    results.push({ id: zone.id, coords: null });
  }
  // Nominatim rate limit: 1 request/second
  await sleep(1100);
}

console.log("\n--- Results ---");
const found = results.filter((r) => r.coords);
const missing = results.filter((r) => !r.coords);
console.log(`Found: ${found.length}/${zones.length}`);
if (missing.length) {
  console.log(`Missing: ${missing.map((r) => r.id).join(", ")}`);
}

if (DRY_RUN) {
  console.log("\n--dry-run: not patching tripZones.ts");
  console.log("\nCoordinates to add:");
  for (const { id, coords } of found) {
    console.log(`  ${id}: { lat: ${coords.lat}, lng: ${coords.lng} }`);
  }
  process.exit(0);
}

// Patch data/tripZones.ts — insert coordinates field after the `id:` line of each zone
const zonesPath = join(ROOT, "data", "tripZones.ts");
let src = readFileSync(zonesPath, "utf8");

let patched = 0;
for (const { id, coords } of found) {
  if (!coords) continue;

  // Match the id line — handles both single and double quotes
  const idEscaped = id.replace(/-/g, "\\-");
  const idPattern = new RegExp(
    `([ \\t]+id:\\s*['"]${idEscaped}['"],)`,
    "g"
  );

  // Skip if coordinates already present anywhere near this id
  const alreadyHas = new RegExp(
    `id:\\s*['"]${idEscaped}['"][\\s\\S]{0,300}coordinates:`
  );
  if (alreadyHas.test(src)) {
    console.log(`  ${id}: already has coordinates, skipping`);
    continue;
  }

  // Preserve the leading whitespace from the id line for the new coordinates line
  const indentMatch = src.match(new RegExp(`([ \\t]+)id:\\s*['"]${idEscaped}['"]`));
  const indent = indentMatch ? indentMatch[1] : "  ";
  const replacement = `$1\n${indent}coordinates: { lat: ${coords.lat}, lng: ${coords.lng} },`;
  const before = src;
  src = src.replace(idPattern, replacement);
  if (src !== before) patched++;
}

writeFileSync(zonesPath, src, "utf8");
console.log(`\nPatched ${patched} zones in data/tripZones.ts`);
if (missing.length) {
  console.log(
    `\n⚠ Could not geocode: ${missing.map((r) => r.id).join(", ")}\n  Add coordinates manually.`
  );
}
