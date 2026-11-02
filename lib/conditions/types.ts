export type WeatherCondition = {
  shortForecast: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  icon: string | null;
  fetchedAt: string;
};

/** Restriction levels the fire sources report (#11). */
export type FireLevel = "Stage 1" | "Stage 2" | "Stage 3" | "Closure";

export type ConditionsUnavailableReason = "no_coordinates";

/** Upstream fire-restriction layers (#11). Definitions live in fireSources.ts. */
export type FireSourceId = "blm-rma" | "utah-ffsl" | "usfs-psicc";

type FireRestrictionCommon = {
  /**
   * Sources behind this answer: the one reporting the restriction, or, for
   * "no restriction", every source that confirmed it.
   */
  sources: FireSourceId[];
  fetchedAt: string;
};

/** An active restriction always has a level; "no restriction" has neither level nor area. */
export type FireRestriction =
  | (FireRestrictionCommon & {
      hasActiveRestriction: true;
      restrictionLevel: FireLevel;
      affectedArea: string | null;
    })
  | (FireRestrictionCommon & {
      hasActiveRestriction: false;
      restrictionLevel: null;
      affectedArea: null;
    });

export type RidbFacility = {
  facilityId: string;
  facilityName: string;
  facilityType: string;
  reservable: boolean;
  // No open/closed status: RIDB has no such field (#36).
};

export type LiveConditions = {
  weather: WeatherCondition | null;
  /** Worst (highest) fire restriction within FIRE_SEARCH_RADIUS_MILES; null = unknown */
  fire: FireRestriction | null;
  /** Nearby Recreation.gov facilities */
  nearbyFacilities: RidbFacility[];
  fetchedAt: string;
  /**
   * True if a lookup failed (vs. data that is simply unavailable). Currently
   * reported by the fire sources only: the weather and RIDB adapters still
   * swallow their errors.
   */
  hasError: boolean;
  /** Set when live conditions were not fetched at all; null otherwise */
  unavailableReason: ConditionsUnavailableReason | null;
};

/** Zone id → live conditions, as returned by GET /api/conditions?ids=… */
export type ConditionsByZone = Record<string, LiveConditions>;
