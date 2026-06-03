/*
 * Origin-aware drive-time estimation — without real geocoding.
 *
 * v1 keeps each zone's hand-curated `driveTimeFromDenverHours` as ground
 * truth. To support other starting points we model drive time as a
 * *geographic delta off the Denver baseline*: we keep a coarse regional
 * centroid for each zone (a general area, never a fragile campsite point)
 * and a small list of known regional origin hubs. The estimate is:
 *
 *   effective = curatedDenverHours
 *             + estHours(origin -> zone) - estHours(Denver -> zone)
 *
 * So Denver resolves to exactly the curated value (delta 0), and other hubs
 * shift up or down sensibly. Free-text locations we don't recognize fall
 * back to the Denver baseline — true geocoding of arbitrary addresses remains
 * a listed limitation.
 */

import type { TripPreferences, TripZone } from "./types";

export type Origin = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

// Average effective road speed and a winding-road multiplier, calibrated so
// Denver-origin estimates land near the curated values.
const AVG_MPH = 55;
const ROAD_FACTOR = 1.3;

export const DENVER_ORIGIN: Origin = {
  id: "denver",
  label: "Denver, CO",
  lat: 39.7392,
  lng: -104.9903,
};

/** Known regional origin hubs the user can pick from. */
export const ORIGIN_PRESETS: Origin[] = [
  DENVER_ORIGIN,
  { id: "boulder", label: "Boulder, CO", lat: 40.015, lng: -105.2705 },
  { id: "fort-collins", label: "Fort Collins, CO", lat: 40.5853, lng: -105.0844 },
  { id: "colorado-springs", label: "Colorado Springs, CO", lat: 38.8339, lng: -104.8214 },
  { id: "pueblo", label: "Pueblo, CO", lat: 38.2544, lng: -104.6091 },
  { id: "grand-junction", label: "Grand Junction, CO", lat: 39.0639, lng: -108.5506 },
  { id: "cheyenne", label: "Cheyenne, WY", lat: 41.14, lng: -104.8202 },
  { id: "laramie", label: "Laramie, WY", lat: 41.3114, lng: -105.5911 },
  { id: "salt-lake-city", label: "Salt Lake City, UT", lat: 40.7608, lng: -111.891 },
  { id: "moab", label: "Moab, UT", lat: 38.5733, lng: -109.5498 },
];

/**
 * Coarse regional centroids for each seed zone (general areas only). Used
 * purely to compute relative drive-time deltas between origins.
 */
const ZONE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "taylor-park": { lat: 38.82, lng: -106.61 },
  "grand-mesa": { lat: 39.05, lng: -108.04 },
  "flat-tops": { lat: 39.98, lng: -107.23 },
  "medicine-bow": { lat: 41.34, lng: -106.3 },
  vedauwoo: { lat: 41.16, lng: -105.38 },
  "flaming-gorge": { lat: 40.92, lng: -109.42 },
  "moab-area": { lat: 38.57, lng: -109.55 },
  "san-rafael-swell": { lat: 38.85, lng: -110.7 },
  "capitol-reef-area": { lat: 38.2, lng: -111.17 },
  "uncompahgre-plateau": { lat: 38.4, lng: -108.4 },
  "arkansas-river-valley": { lat: 38.7, lng: -106.1 },
  "buena-vista-fourmile": { lat: 38.85, lng: -106.1 },
  "walden-north-park": { lat: 40.73, lng: -106.28 },
  "snowy-range": { lat: 41.36, lng: -106.32 },
  "poudre-canyon": { lat: 40.69, lng: -105.45 },
  "gunnison-hartman": { lat: 38.5, lng: -106.97 },
  "rabbit-valley": { lat: 39.18, lng: -108.99 },
  "dinosaur-browns-park": { lat: 40.52, lng: -108.97 },
  "manti-la-sal": { lat: 38.45, lng: -109.25 },
  "fishlake-national-forest": { lat: 38.55, lng: -111.7 },
  "uinta-mountains": { lat: 40.71, lng: -110.38 },
  "red-feather-lakes": { lat: 40.8, lng: -105.58 },
  "south-park-eleven-mile": { lat: 38.93, lng: -105.5 },
  "book-cliffs": { lat: 39.3, lng: -109.4 },
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in miles. */
function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 3958.8; // Earth radius, miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function estHours(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  return (haversineMiles(from, to) * ROAD_FACTOR) / AVG_MPH;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Resolve a free-text starting location to a known origin hub. Matches on the
 * city portion; unrecognized input falls back to Denver (the v1 baseline).
 */
export function resolveOrigin(startingLocation: string): Origin {
  const input = normalize(startingLocation);
  if (!input) return DENVER_ORIGIN;
  for (const o of ORIGIN_PRESETS) {
    const city = normalize(o.label.split(",")[0]);
    if (input === city || input.includes(city) || city.includes(input)) {
      return o;
    }
  }
  return DENVER_ORIGIN;
}

/** Whether the entered location matched a known hub (vs. Denver fallback). */
export function isKnownOrigin(startingLocation: string): boolean {
  const resolved = resolveOrigin(startingLocation);
  if (resolved.id !== "denver") return true;
  return normalize(startingLocation).includes("denver");
}

/** Effective drive time from a resolved origin to a trip zone, in hours. */
export function effectiveDriveHours(origin: Origin, trip: TripZone): number {
  const centroid = ZONE_CENTROIDS[trip.id];
  if (!centroid) return trip.driveTimeFromDenverHours;
  const delta = estHours(origin, centroid) - estHours(DENVER_ORIGIN, centroid);
  const adjusted = trip.driveTimeFromDenverHours + delta;
  // Clamp to a sane floor and round to the nearest quarter hour.
  return Math.max(0.5, Math.round(adjusted * 4) / 4);
}

/** Convenience: effective drive time using the preferences' starting location. */
export function getEffectiveDriveHours(
  prefs: TripPreferences,
  trip: TripZone
): number {
  return effectiveDriveHours(resolveOrigin(prefs.startingLocation), trip);
}
