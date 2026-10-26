/*
 * Central constants for WanderMate: option labels, enum mappings, scoring
 * weights, and shared lookup tables. Keeping these in one place makes the
 * scoring engine tunable and the form / display code consistent.
 */

import type {
  ActivityKey,
  ActivityWeight,
  CampingType,
  SkillLevel,
  VehicleRequirement,
} from "./types";
import type { FireLevel } from "./conditions/types";

export const DEFAULT_STARTING_LOCATION = "Denver, CO";
export const LAUNCH_REGION_LABEL = "MVP region: Colorado, Wyoming & Utah";

export const ACTIVITIES: { key: ActivityKey; label: string }[] = [
  { key: "dispersedCamping", label: "Dispersed camping" },
  { key: "developedCamping", label: "Developed camping" },
  { key: "hiking", label: "Hiking" },
  { key: "backpacking", label: "Backpacking" },
  { key: "dirtBikingOhv", label: "Dirt biking / OHV" },
  { key: "overlanding", label: "Overlanding" },
  { key: "fishing", label: "Fishing" },
  { key: "kayaking", label: "Kayaking" },
  { key: "canoeing", label: "Canoeing" },
  { key: "motorBoating", label: "Motor boating" },
  { key: "lakeAccess", label: "Lake access" },
  { key: "scenicDrive", label: "Scenic drive" },
  { key: "wildlife", label: "Wildlife viewing" },
  { key: "photography", label: "Photography" },
  { key: "winterAccess", label: "Winter access" },
  { key: "climbing", label: "Climbing" },
  { key: "mountainBiking", label: "Mountain biking" },
  { key: "stargazing", label: "Stargazing" },
  { key: "golf", label: "Golf" },
  { key: "dining", label: "Dining / local eats" },
];

export const ACTIVITY_LABELS: Record<ActivityKey, string> = ACTIVITIES.reduce(
  (acc, a) => {
    acc[a.key] = a.label;
    return acc;
  },
  {} as Record<ActivityKey, string>
);

export const ACTIVITY_WEIGHT_OPTIONS: {
  value: ActivityWeight;
  label: string;
}[] = [
  { value: "nice_to_have", label: "Nice to have" },
  { value: "important", label: "Important" },
  { value: "must_have", label: "Must have" },
];

export const ACTIVITY_WEIGHT_MULTIPLIER: Record<ActivityWeight, number> = {
  nice_to_have: 1,
  important: 2,
  must_have: 3.5,
};

export const DRIVE_TIME_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 3, label: "3 hours" },
  { value: 4, label: "4 hours" },
  { value: 5, label: "5 hours" },
  { value: 6, label: "6 hours or more" },
];

export const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export const SKILL_RANK: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

export const OFF_GRID_OPTIONS: { value: 1 | 2 | 3 | 4; label: string }[] = [
  { value: 1, label: "Easy and accessible" },
  { value: 2, label: "Somewhat remote" },
  { value: 3, label: "Properly off-grid" },
  { value: 4, label: "Deep backcountry" },
];

export const CROWD_TOLERANCE_OPTIONS: {
  value: 1 | 2 | 3 | 4;
  label: string;
}[] = [
  { value: 1, label: "I do not mind people" },
  { value: 2, label: "Balanced" },
  { value: 3, label: "Prefer quiet" },
  { value: 4, label: "Avoid crowds as much as possible" },
];

export const VEHICLE_OPTIONS: {
  value: VehicleRequirement | "not_sure";
  label: string;
}[] = [
  { value: "any_car", label: "Any car" },
  { value: "suv", label: "SUV / crossover" },
  { value: "truck", label: "Truck" },
  { value: "high_clearance_4x4", label: "High-clearance 4x4" },
  { value: "ohv", label: "Dirt bike / OHV" },
  { value: "not_sure", label: "Not sure" },
];

export const VEHICLE_LABELS: Record<VehicleRequirement, string> = {
  any_car: "Any car",
  suv: "SUV / crossover",
  truck: "Truck",
  high_clearance_4x4: "High-clearance 4x4",
  ohv: "Dirt bike / OHV",
};

// Capability ordering for vehicles. Higher rank = more capable access.
export const VEHICLE_RANK: Record<VehicleRequirement, number> = {
  any_car: 1,
  suv: 2,
  truck: 3,
  high_clearance_4x4: 4,
  ohv: 4,
};

export const CAMPING_OPTIONS: {
  value: CampingType | "either";
  label: string;
}[] = [
  { value: "none", label: "No camping" },
  { value: "developed", label: "Developed campground" },
  { value: "dispersed", label: "Dispersed camping" },
  { value: "either", label: "Either" },
  { value: "backpacking", label: "Backpacking" },
];

export const CAMPING_LABELS: Record<CampingType, string> = {
  none: "No camping",
  developed: "Developed campground",
  dispersed: "Dispersed camping",
  backpacking: "Backpacking",
};

export const RISK_TOLERANCE_OPTIONS: {
  value: 1 | 2 | 3 | 4;
  label: string;
}[] = [
  { value: 1, label: "Low risk, easy access" },
  { value: 2, label: "Moderate adventure" },
  { value: 3, label: "Challenging but reasonable" },
  { value: 4, label: "High adventure" },
];

export const VIBE_OPTIONS: string[] = [
  "Alpine",
  "Desert",
  "Forest",
  "Lake / river",
  "Big views",
  "Remote and quiet",
  "Social / lively",
  "Rugged and adventurous",
  "Beginner-friendly",
  "Peaceful",
  "Group trip",
];

export const MUST_AVOID_OPTIONS: string[] = [
  "Long rough roads",
  "Snow access",
  "Extreme heat",
  "Crowds",
  "Permit-heavy areas",
  "Advanced trails",
  "Water crossings",
  "No cell service",
  "Fire restriction zones",
  "Wildlife-heavy areas",
  "Long hikes",
];

export const GEAR_OPTIONS: string[] = [
  "Tent",
  "Sleeping bag",
  "Camp stove",
  "Fishing gear",
  "Dirt bike",
  "4x4 vehicle",
  "Kayak / canoe",
  "Motorboat",
  "Paddleboard",
  "Backpacking gear",
  "Recovery boards",
  "Satellite communicator",
  "Bear canister",
  "Winter gear",
  "Golf clubs",
];

// Base scoring weights. Sum = 100.
export const SCORE_WEIGHTS = {
  activityFit: 28,
  driveTimeFit: 9,
  skillFit: 11,
  offGridFit: 10,
  crowdFit: 7,
  vehicleFit: 9,
  campingFit: 5,
  vibeFit: 5,
  gearFit: 3,
  seasonFit: 4,
  riskFit: 9,
} as const;

// Missing must-have activities (rating <= 1): points lost per activity, and the
// most this penalty can take off in total. Cap is reached at 5+ missing (#19).
export const MISSING_MUST_HAVE_PENALTY = {
  perActivity: 10,
  cap: 45,
} as const;

// Live fire-restriction ranking penalty, in points, by level (#13). Stage 2
// (partial) is 1.5x Stage 1; Stage 3 matches Closure. None / unknown cost 0.
export const FIRE_PENALTY: Record<FireLevel, number> = {
  "Stage 1": 5,
  "Stage 2 (partial)": 7.5,
  "Stage 2": 12,
  "Stage 3": 30,
  Closure: 30,
};

// Short, lower-case labels for risk tolerance, used in explanations.
export const RISK_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "low-risk",
  2: "moderate",
  3: "challenging",
  4: "high-adventure",
};
