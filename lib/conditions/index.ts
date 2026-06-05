import type { TripZone } from "@/lib/types";
import type { LiveConditions } from "./types";
import { fetchWeatherForCoords } from "./weatherGov";
import { fetchFireRestrictions } from "./fireRestrictions";
import { fetchNearbyFacilities } from "./ridb";

export type { LiveConditions, WeatherCondition, FireRestriction, RidbFacility } from "./types";

const NO_COORDS: LiveConditions = {
  weather: null,
  fire: null,
  nearbyFacilities: [],
  fetchedAt: new Date().toISOString(),
  hasError: false,
};

export async function fetchLiveConditions(zone: TripZone): Promise<LiveConditions> {
  if (!zone.coordinates) return NO_COORDS;

  const { lat, lng } = zone.coordinates;
  const fetchedAt = new Date().toISOString();

  const [weather, fire, nearbyFacilities] = await Promise.allSettled([
    fetchWeatherForCoords(lat, lng),
    fetchFireRestrictions(lat, lng),
    fetchNearbyFacilities(lat, lng),
  ]);

  return {
    weather: weather.status === "fulfilled" ? weather.value : null,
    fire: fire.status === "fulfilled" ? fire.value : null,
    nearbyFacilities:
      nearbyFacilities.status === "fulfilled" ? nearbyFacilities.value : [],
    fetchedAt,
    hasError:
      weather.status === "rejected" ||
      fire.status === "rejected" ||
      nearbyFacilities.status === "rejected",
  };
}
