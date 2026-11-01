export type WeatherCondition = {
  shortForecast: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  icon: string | null;
  fetchedAt: string;
};

/** "Stage 2 (partial)" = a Stage 2 order with exemptions (e.g. gas stoves allowed). */
export type FireLevel = "Stage 1" | "Stage 2 (partial)" | "Stage 2" | "Stage 3" | "Closure";

export type ConditionsUnavailableReason = "no_coordinates";

export type FireRestriction = {
  hasActiveRestriction: boolean;
  /** Null when no active restriction */
  restrictionLevel: FireLevel | null;
  affectedArea: string | null;
  source: "usfs" | "blm";
  fetchedAt: string;
};

export type RidbFacility = {
  facilityId: string;
  facilityName: string;
  facilityType: string;
  reservable: boolean;
  /** Null means status unknown */
  status: "Open" | "Closed" | "Limited" | null;
};

export type LiveConditions = {
  weather: WeatherCondition | null;
  /** Worst (highest) fire restriction found within ~50 mi */
  fire: FireRestriction | null;
  /** Nearby Recreation.gov facilities */
  nearbyFacilities: RidbFacility[];
  fetchedAt: string;
  /** True if at least one source returned an error */
  hasError: boolean;
  /** Set when live conditions were not fetched at all; null otherwise */
  unavailableReason: ConditionsUnavailableReason | null;
};

/** Zone id → live conditions, as returned by GET /api/conditions?ids=… */
export type ConditionsByZone = Record<string, LiveConditions>;
