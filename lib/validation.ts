/*
 * Zod schema for validating trip preferences before scoring. Mirrors the
 * TripPreferences type and is used by the planner form on submit.
 */

import { z } from "zod";
import { ACTIVITIES } from "./constants";
import type { ActivityKey, TripPreferences } from "./types";

const activityWeight = z.enum(["nice_to_have", "important", "must_have"]);

// Only known activities are accepted, so a crafted link can't add an
// activity no zone has (which would count as a missing must-have everywhere).
const activityKey = z.enum(
  ACTIVITIES.map((a) => a.key) as [ActivityKey, ...ActivityKey[]]
);

export const tripPreferencesSchema = z.object({
  startingLocation: z.string().min(1, "Add a starting location"),
  maxDriveTimeHours: z.number().min(1).max(6),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  selectedActivities: z.record(activityKey, activityWeight),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  offGridPreference: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  crowdTolerance: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  vehicleCapability: z.enum([
    "any_car",
    "suv",
    "truck",
    "high_clearance_4x4",
    "ohv",
    "not_sure",
  ]),
  campingPreference: z.enum([
    "none",
    "developed",
    "dispersed",
    "backpacking",
    "either",
  ]),
  riskTolerance: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  vibes: z.array(z.string()),
  mustAvoid: z.array(z.string()),
  gear: z.array(z.string()),
});

export type ValidatedPreferences = z.infer<typeof tripPreferencesSchema>;

export function validatePreferences(data: unknown):
  | { success: true; data: TripPreferences }
  | { success: false; error: string } {
  const parsed = tripPreferencesSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid preferences" };
  }
  return { success: true, data: parsed.data as TripPreferences };
}
