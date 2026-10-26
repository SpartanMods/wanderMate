/*
 * Core domain types for WanderMate.
 *
 * These types model trip zones (the seed data), user trip preferences,
 * and the output of the scoring / recommendation engine. They are the
 * single source of truth for the shape of data flowing through the app.
 */

export type ActivityKey =
  | "dispersedCamping"
  | "developedCamping"
  | "hiking"
  | "backpacking"
  | "dirtBikingOhv"
  | "overlanding"
  | "fishing"
  | "kayaking"
  | "canoeing"
  | "motorBoating"
  | "lakeAccess"
  | "scenicDrive"
  | "wildlife"
  | "photography"
  | "winterAccess"
  | "climbing"
  | "mountainBiking"
  | "stargazing"
  | "golf"
  | "dining";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type VehicleRequirement =
  | "any_car"
  | "suv"
  | "truck"
  | "high_clearance_4x4"
  | "ohv";

export type CampingType = "none" | "developed" | "dispersed" | "backpacking";

export type ActivityWeight = "nice_to_have" | "important" | "must_have";

export type DataConfidence = "high" | "medium" | "low";

export type Season = "spring" | "summer" | "fall" | "winter";

// ---------------------------------------------------------------------------
// Data quality model
//
// WanderMate's seed data is manually curated, not live. These structured
// fields let the app communicate *how trustworthy* each part of a zone is,
// when it was last reviewed, what land manager governs it, and how sensitive
// the location is — so users can verify the right things before they go.
// ---------------------------------------------------------------------------

export type ConfidenceLevel = "high" | "medium" | "low";

export type ConfidenceCategory = {
  level: ConfidenceLevel;
  /** Plain-English explanation of why this category has the given confidence. */
  notes: string;
};

export type TripDataQuality = {
  overall: ConfidenceCategory;
  access: ConfidenceCategory;
  camping: ConfidenceCategory;
  activities: ConfidenceCategory;
  legality: ConfidenceCategory;
  seasonality: ConfidenceCategory;
  /** ISO date (YYYY-MM-DD) the zone was last hand-reviewed. */
  lastReviewedAt: string;
};

export type LandManagerType =
  | "usfs"
  | "blm"
  | "nps"
  | "state"
  | "county"
  | "city"
  | "private"
  | "mixed"
  | "unknown";

/**
 * How sensitive the underlying location is, and therefore how much it has
 * been generalized in the seed data.
 * - none: ordinary area, no special protection
 * - generalized: described as a general area only (the WanderMate default)
 * - fragile: ecologically/culturally fragile — extra-coarse on purpose
 * - restricted: access is legally restricted; details intentionally withheld
 */
export type SensitiveLocationLevel = "none" | "generalized" | "fragile" | "restricted";

export type RoadAccess = {
  accessRoadDifficulty: 1 | 2 | 3 | 4 | 5;
  clearanceNeeded:
    | "none"
    | "low_clearance"
    | "moderate_clearance"
    | "high_clearance";
  fourWheelDriveRequired: boolean;
  trailerFriendly: boolean;
  winterAccessRisk: 1 | 2 | 3 | 4 | 5;
};

export type LegalityInfo = {
  dispersedCampingAllowed: "yes" | "no" | "seasonal" | "unknown";
  campfireRestrictionsCommon: boolean;
  permitLikelyRequired: boolean;
  ohvLegal: "yes" | "no" | "area_specific" | "unknown";
  platedVehicleRequired: "yes" | "no" | "area_specific" | "unknown";
};

export type RemotenessInfo = {
  cellServiceLikelihood: 1 | 2 | 3 | 4 | 5;
  nearestTown: string;
  fuelDistanceMilesEstimate: number | null;
  waterAvailability: "reliable" | "seasonal" | "limited" | "none" | "unknown";
};

export type VerificationLinkCategory =
  | "land_manager"
  | "camping"
  | "ohv"
  | "fire"
  | "road"
  | "weather"
  | "general";

export type VerificationLink = {
  label: string;
  url: string;
  type: "official" | "map" | "reference" | "manual";
  category: VerificationLinkCategory;
};

export type TripZone = {
  id: string;
  name: string;
  region: string;
  state: string;
  coordinates?: { lat: number; lng: number };
  summary: string;
  generalArea: string;
  activities: Record<ActivityKey, number>;
  skillLevel: SkillLevel;
  minRecommendedSkill: SkillLevel;
  offGridLevel: 1 | 2 | 3 | 4;
  crowdLevel: 1 | 2 | 3 | 4 | 5;
  hiddenGemScore: 1 | 2 | 3 | 4 | 5;
  popularityScore: 1 | 2 | 3 | 4 | 5;
  vehicleRequirement: VehicleRequirement;
  campingTypes: CampingType[];
  driveTimeFromDenverHours: number;
  bestSeasons: Array<Season>;
  vibes: string[];
  avoidFlags: string[];
  watchouts: string[];
  safetyNotes: string[];
  suggestedItinerary: string[];
  backupOptions: string[];
  sourceLinks: {
    label: string;
    url: string;
    type: "official" | "map" | "reference" | "manual";
  }[];
  /**
   * @deprecated Kept for backward compatibility. Prefer `dataQuality.overall`
   * in new UI and scoring code.
   */
  dataConfidence: DataConfidence;
  /** Which agency/agencies govern the zone (drives rules & verification). */
  landManager: LandManagerType;
  /** Structured, category-based confidence + last-reviewed metadata. */
  dataQuality: TripDataQuality;
  /** How generalized the location is, for sensitive-place protection. */
  sensitiveLocationLevel: SensitiveLocationLevel;
  roadAccess: RoadAccess;
  legality: LegalityInfo;
  remoteness: RemotenessInfo;
  /** Categorized links a user can use to verify current conditions. */
  verificationLinks: VerificationLink[];
};

export type TripPreferences = {
  startingLocation: string;
  maxDriveTimeHours: number;
  startDate?: string;
  endDate?: string;
  selectedActivities: Partial<Record<ActivityKey, ActivityWeight>>;
  experienceLevel: SkillLevel;
  offGridPreference: 1 | 2 | 3 | 4;
  crowdTolerance: 1 | 2 | 3 | 4;
  vehicleCapability: VehicleRequirement | "not_sure";
  campingPreference: CampingType | "either";
  riskTolerance: 1 | 2 | 3 | 4;
  vibes: string[];
  mustAvoid: string[];
  gear: string[];
};

export type ScoreBreakdown = {
  activityFit: number;
  driveTimeFit: number;
  skillFit: number;
  offGridFit: number;
  crowdFit: number;
  vehicleFit: number;
  campingFit: number;
  vibeFit: number;
  gearFit: number;
  seasonFit: number;
  /** How well the trip's overall riskiness matches the user's risk tolerance. */
  riskFit: number;
  penalties: number;
  /** Live fire-restriction deduction (0 or negative); 0 when status is none/unknown. */
  firePenalty: number;
  /**
   * Extra safety guardrail deduction applied when a lower-risk user is matched
   * to a trip carrying specific hazards (rough access, winter risk, weak cell,
   * legality uncertainty). Shown separately from `penalties` for transparency.
   */
  riskPenalty: number;
  hiddenGemBoost: number;
  finalScore: number;
};

export type TripRecommendation = {
  trip: TripZone;
  score: number;
  qualityLabel: string;
  breakdown: ScoreBreakdown;
  whyItMatches: string[];
  whyItMightNot: string[];
  /** Drive time from the user's chosen starting location, in hours. */
  effectiveDriveHours: number;
};
