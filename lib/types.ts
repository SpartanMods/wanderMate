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
  | "lakePaddle"
  | "scenicDrive"
  | "wildlife"
  | "photography"
  | "winterAccess"
  | "climbing"
  | "mountainBiking"
  | "stargazing";

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

export type TripZone = {
  id: string;
  name: string;
  region: string;
  state: "CO" | "WY" | "UT";
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
  dataConfidence: DataConfidence;
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
  penalties: number;
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
