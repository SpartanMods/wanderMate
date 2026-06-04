/*
 * Mock social profile for WanderMate development and as a localStorage fallback.
 *
 * This represents a single demo user — a "trip-centered identity" — so the
 * social UI can be built against realistic data before any real persistence or
 * auth exists. Stats here are illustrative; the storage adapter is the source
 * of truth at runtime and keeps them in sync with saved trips and journals.
 *
 * No exact campsites or coordinates appear anywhere in this file.
 */

import type { SocialProfile } from "../lib/socialTypes";

export const mockSocialProfile: SocialProfile = {
  id: "user_demo_wanderer",
  username: "highcountry_sam",
  displayName: "Sam R.",
  bio:
    "Weekend basecamper chasing quiet aspen groves and trout water. I'd rather " +
    "drive an extra hour for solitude than fight a crowd. Notes here are meant " +
    "to help friends make better calls, not to drop pins on fragile spots.",
  homeBase: "Denver, Colorado",
  // No avatar image upload in this MVP — UI renders initials or a theme color.
  coverTheme: "alpine-dusk",
  favoriteActivities: ["dispersedCamping", "fishing", "hiking", "scenicDrive"],
  preferredTripStyles: [
    "weekend basecamp",
    "quiet over crowded",
    "trout-water adjacent",
    "easy overlanding",
  ],
  vehicleOrRig: "4Runner with a rooftop tent",
  experienceLevel: "intermediate",
  // Default to private: nothing leaves the device in this localStorage-only MVP.
  visibility: "private",
  stats: {
    savedTripsCount: 3,
    tripsTakenCount: 2,
    statesExploredCount: 2,
    favoriteActivity: "Dispersed camping",
  },
  followerCount: 0,
  followingCount: 0,
  createdAt: "2026-03-01T16:20:00.000Z",
  updatedAt: "2026-05-28T14:05:00.000Z",
};
