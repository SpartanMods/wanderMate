/*
 * Mock saved trips for development and as a localStorage fallback.
 *
 * Each entry is a bookmark of a seed TripZone (referenced by id) with the demo
 * user's own status and notes. tripZoneId values match ids in data/tripZones.ts.
 * Notes are generalized planning thoughts — no exact campsites or coordinates.
 */

import type { SavedTrip } from "../lib/socialTypes";
import { mockSocialProfile } from "./mockSocialProfile";

const USER_ID = mockSocialProfile.id;

export const mockSavedTrips: SavedTrip[] = [
  {
    id: "saved_taylor_park",
    userId: USER_ID,
    tripZoneId: "taylor-park",
    tripName: "Taylor Park",
    status: "planned",
    visibility: "private",
    savedAt: "2026-04-12T18:30:00.000Z",
    plannedDate: "2026-07-18",
    notes:
      "Targeting a mid-July basecamp once the high roads dry out. Want to fish " +
      "the reservoir and day-trip the surrounding forest. Confirm dispersed " +
      "rules before going.",
    sourceRecommendationScore: 88,
  },
  {
    id: "saved_grand_mesa",
    userId: USER_ID,
    tripZoneId: "grand-mesa",
    tripName: "Grand Mesa",
    status: "saved",
    visibility: "private",
    savedAt: "2026-05-02T15:10:00.000Z",
    notes:
      "Backup option for a hot weekend — high elevation stays cooler. Lots of " +
      "small lakes for easy paddling and shoreline fishing.",
    sourceRecommendationScore: 81,
  },
  {
    id: "saved_snowy_range",
    userId: USER_ID,
    tripZoneId: "snowy-range",
    tripName: "Snowy Range",
    status: "completed",
    visibility: "unlisted",
    savedAt: "2026-03-20T12:00:00.000Z",
    plannedDate: "2026-05-24",
    notes:
      "Went over Memorial Day weekend — wrote a journal about it. Scenic drive " +
      "was the highlight; some trailheads still had lingering snow.",
    sourceRecommendationScore: 84,
  },
];
