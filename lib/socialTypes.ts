/*
 * Social domain types for WanderMate.
 *
 * WanderMate's social layer is intentionally NOT a feed, a follower graph, or
 * a photo-sharing app. It is "trip-centered identity": a profile exists to
 * answer a few honest questions about a person outdoors —
 *   - Who is this person outdoors?
 *   - What trips do they save?
 *   - What trips have they actually taken?
 *   - What did they learn?
 *   - What would they recommend?
 *
 * These types model that intent: a lightweight profile, the trips a user has
 * saved from recommendations, and the trip journals they write to help friends
 * make better outdoor decisions. They deliberately reuse the location-privacy
 * vocabulary from the core domain (see SensitiveLocationLevel in ./types) so
 * that journals never expose exact campsites or coordinates.
 */

import type { ActivityKey, SkillLevel } from "./types";

// ---------------------------------------------------------------------------
// Shared enums / unions
// ---------------------------------------------------------------------------

/**
 * Who can see a piece of social content.
 *
 * NOTE: WanderMate's MVP stores everything in localStorage, so nothing is
 * actually shared off-device yet. "followers" and "public" describe *intended*
 * audience only — honoring them requires real cloud persistence and auth,
 * which is out of scope for this foundation. Treat these as design intent.
 */
export type Visibility = "private" | "unlisted" | "followers" | "public";

/** Lifecycle of a written trip journal. */
export type TripJournalStatus = "planned" | "completed" | "archived";

/** Lifecycle of a saved (bookmarked) trip recommendation. */
export type SavedTripStatus = "saved" | "planned" | "completed";

/**
 * The shape of a trip's route, described generally — never as a precise track.
 * "basecamp" = stay put and day-trip out; "mixed" = combination of the above.
 */
export type RouteType =
  | "basecamp"
  | "loop"
  | "out_and_back"
  | "point_to_point"
  | "scenic_drive"
  | "ohv_route"
  | "mixed";

// ---------------------------------------------------------------------------
// Sensitive-location protection
//
// Mirrors the spirit of SensitiveLocationLevel in ./types: WanderMate
// generalizes fragile/restricted places on purpose. A journal carries its own
// setting so user-authored content can be redacted just like seed data.
// ---------------------------------------------------------------------------

export type SensitiveLocationSetting = {
  /**
   * How much the location has been generalized.
   * - none: ordinary area, no special protection needed
   * - generalized: described as a general area only (the WanderMate default)
   * - fragile: ecologically/culturally fragile — kept extra-coarse on purpose
   * - restricted: access is legally restricted; details intentionally withheld
   */
  level: "none" | "generalized" | "fragile" | "restricted";
  /** The coarse, shareable description shown to others (e.g. "Gunnison County, CO"). */
  displayArea: string;
  /** Optional plain-English reason the precise location was withheld. */
  redactionReason?: string;
};

// ---------------------------------------------------------------------------
// Social profile
//
// A trip-centered identity. Stats are denormalized counters kept in sync by the
// storage adapter so the profile can render without recomputing every read.
// ---------------------------------------------------------------------------

export type ProfileStats = {
  savedTripsCount: number;
  tripsTakenCount: number;
  statesExploredCount: number;
  /** The user's most-logged activity, as a human-readable label. */
  favoriteActivity: string;
};

export type SocialProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  homeBase: string;
  avatarUrl?: string;
  /** Named cover gradient/theme key — no image upload in this MVP. */
  coverTheme: string;
  favoriteActivities: ActivityKey[];
  /** Free-form trip-style tags, e.g. "weekend basecamp", "remote overlanding". */
  preferredTripStyles: string[];
  vehicleOrRig: string;
  experienceLevel: SkillLevel;
  visibility: Visibility;
  stats: ProfileStats;
  followerCount?: number;
  followingCount?: number;
  /** ISO date-time strings (YYYY-MM-DDTHH:mm:ss.sssZ). */
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Saved trips
//
// A bookmark of a recommended TripZone, with the user's own status and notes.
// References a zone by id (tripZoneId) rather than copying its data.
// ---------------------------------------------------------------------------

export type SavedTrip = {
  id: string;
  userId: string;
  /** References a TripZone.id from data/tripZones.ts. */
  tripZoneId: string;
  /** Snapshot of the zone name at save time, for display convenience. */
  tripName: string;
  status: SavedTripStatus;
  visibility: Visibility;
  savedAt: string;
  /** Optional ISO date the user plans to go (YYYY-MM-DD). */
  plannedDate?: string;
  notes?: string;
  /** The recommendation score (0-100) at the time it was saved, if known. */
  sourceRecommendationScore?: number;
};

// ---------------------------------------------------------------------------
// Trip journals
//
// A generalized write-up of a trip a user took (or is planning). This is the
// heart of the social layer: useful, decision-helping documentation — not a
// photo feed. Locations are always generalized via sensitiveLocation.
// ---------------------------------------------------------------------------

export type TripJournal = {
  id: string;
  userId: string;
  /** URL-safe identifier derived from the title; unique per store. */
  slug: string;
  title: string;
  /** Optional link back to a seed TripZone this trip was based on. */
  tripZoneId?: string;
  /** Optional display name of the trip/zone. */
  tripName?: string;
  status: TripJournalStatus;
  visibility: Visibility;
  /** ISO dates (YYYY-MM-DD). */
  startDate?: string;
  endDate?: string;
  /** Coarse area description — county/region, never exact coordinates. */
  generalArea: string;
  state?: string;
  activities: ActivityKey[];
  routeType: RouteType;
  /** Generalized narrative of the route — no turn-by-turn or GPS traces. */
  routeSummary: string;
  distanceMiles?: number;
  elevationGainFeet?: number;
  driveTimeHours?: number;
  difficulty: SkillLevel;
  vehicleUsed?: string;
  companions?: string;
  notes: string;
  highlights: string[];
  watchouts: string[];
  lessonsLearned: string[];
  safetyNotes: string[];
  wouldReturn?: boolean;
  /** Optional 1-5 personal rating. */
  rating?: number;
  sensitiveLocation: SensitiveLocationSetting;
  /** ISO date-time strings. */
  createdAt: string;
  updatedAt: string;
};

/**
 * Input shape for creating/editing a journal. Server-managed fields (id, slug,
 * userId, timestamps) are omitted — the storage adapter fills them in. Most
 * list fields are optional here so a form can submit a partial draft safely.
 */
export type TripJournalFormInput = {
  title: string;
  tripZoneId?: string;
  tripName?: string;
  status?: TripJournalStatus;
  visibility?: Visibility;
  startDate?: string;
  endDate?: string;
  generalArea: string;
  state?: string;
  activities?: ActivityKey[];
  routeType: RouteType;
  routeSummary: string;
  distanceMiles?: number;
  elevationGainFeet?: number;
  driveTimeHours?: number;
  difficulty: SkillLevel;
  vehicleUsed?: string;
  companions?: string;
  notes?: string;
  highlights?: string[];
  watchouts?: string[];
  lessonsLearned?: string[];
  safetyNotes?: string[];
  wouldReturn?: boolean;
  rating?: number;
  sensitiveLocation?: SensitiveLocationSetting;
};
