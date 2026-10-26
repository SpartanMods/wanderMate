import type { TripZone } from "@/lib/types";
import type { LiveConditions } from "./types";
import { fetchWeatherForCoords } from "./weatherGov";
import { fetchFireRestrictions } from "./fireRestrictions";
import { fetchNearbyFacilities } from "./ridb";

export type {
  ConditionsByZone,
  ConditionsUnavailableReason,
  LiveConditions,
  WeatherCondition,
  FireLevel,
  FireRestriction,
  RidbFacility,
} from "./types";

/** Built per call so `fetchedAt` is current and callers never share an object. */
export function noCoordsConditions(): LiveConditions {
  return {
    weather: null,
    fire: null,
    nearbyFacilities: [],
    fetchedAt: new Date().toISOString(),
    hasError: false,
    unavailableReason: "no_coordinates",
  };
}

export async function fetchLiveConditions(zone: TripZone): Promise<LiveConditions> {
  if (!zone.coordinates) return noCoordsConditions();

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
    unavailableReason: null,
  };
}
