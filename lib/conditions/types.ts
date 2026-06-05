export type WeatherCondition = {
  shortForecast: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  icon: string | null;
  fetchedAt: string;
};

export type FireRestriction = {
  hasActiveRestriction: boolean;
  /** "Stage 1", "Stage 2", "Closure", etc. — null when no active restriction */
  restrictionLevel: string | null;
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
};
