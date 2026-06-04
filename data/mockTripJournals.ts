/*
 * Mock trip journals for development and as a localStorage fallback.
 *
 * These are generalized, decision-helping write-ups — the heart of WanderMate's
 * social layer. They are NOT a photo feed and contain NO exact campsites, GPS
 * traces, or coordinates: every journal carries a sensitiveLocation setting and
 * describes areas only at county/region granularity.
 *
 * tripZoneId values (when present) match ids in data/tripZones.ts.
 */

import type { TripJournal } from "../lib/socialTypes";
import { mockSocialProfile } from "./mockSocialProfile";

const USER_ID = mockSocialProfile.id;

export const mockTripJournals: TripJournal[] = [
  {
    id: "journal_snowy_range_memorial",
    userId: USER_ID,
    slug: "snowy-range-memorial-weekend",
    title: "Snowy Range Memorial-Weekend Basecamp",
    tripZoneId: "snowy-range",
    tripName: "Snowy Range",
    status: "completed",
    visibility: "unlisted",
    startDate: "2026-05-24",
    endDate: "2026-05-26",
    generalArea: "Albany County, Wyoming",
    state: "WY",
    activities: ["dispersedCamping", "scenicDrive", "hiking", "photography"],
    routeType: "basecamp",
    routeSummary:
      "Set up a basecamp in the national forest at lower elevation and day-tripped " +
      "the scenic byway and a couple of short trails. Treated it as a shoulder-season " +
      "shakedown rather than a summit objective.",
    distanceMiles: 9,
    elevationGainFeet: 1200,
    driveTimeHours: 2.5,
    difficulty: "intermediate",
    vehicleUsed: "4Runner (no low-range needed at this time of year)",
    companions: "Two friends, two dogs",
    notes:
      "Great early-season option if you keep expectations realistic. The byway " +
      "carries most of the scenery, so even a snowed-out trail day isn't a bust.",
    highlights: [
      "Quiet forest camping well below the crowds",
      "Scenic byway pullouts were the trip's MVP",
      "Cold, clear nights — excellent for stargazing",
    ],
    watchouts: [
      "Higher trailheads still held snow and mud in late May",
      "Afternoon wind picked up fast above treeline",
      "Cell service was unreliable once off the main road",
    ],
    lessonsLearned: [
      "Bring real mud-season footwear, not trail runners",
      "Have a scenic-drive plan B for any snowed-in trail",
    ],
    safetyNotes: [
      "Carry chains/traction and check the WYDOT 511 forecast before the pass",
      "Tell someone your general plan — coverage is spotty",
    ],
    wouldReturn: true,
    rating: 4,
    sensitiveLocation: {
      level: "generalized",
      displayArea: "Albany County, Wyoming",
      redactionReason:
        "Dispersed sites kept general to avoid concentrating use on a few spots.",
    },
    createdAt: "2026-05-27T17:40:00.000Z",
    updatedAt: "2026-05-28T14:05:00.000Z",
  },
  {
    id: "journal_grand_mesa_lakes",
    userId: USER_ID,
    slug: "grand-mesa-lake-hopping",
    title: "Grand Mesa Lake-Hopping (Heat Escape)",
    tripZoneId: "grand-mesa",
    tripName: "Grand Mesa",
    status: "completed",
    visibility: "private",
    startDate: "2025-08-08",
    endDate: "2025-08-10",
    generalArea: "Mesa County, Colorado",
    state: "CO",
    activities: ["fishing", "lakePaddle", "developedCamping", "scenicDrive"],
    routeType: "basecamp",
    routeSummary:
      "Booked a developed site as a basecamp and bounced between several of the " +
      "mesa's small lakes for shoreline fishing and easy paddling. Low-mileage, " +
      "high-relaxation trip built around staying cool.",
    distanceMiles: 4,
    elevationGainFeet: 300,
    driveTimeHours: 4,
    difficulty: "beginner",
    vehicleUsed: "Any car gets to the developed area; gravel spurs want clearance",
    companions: "Family trip, two kids",
    notes:
      "Perfect when the valleys are baking — the mesa top runs much cooler. Great " +
      "intro-level trip that still feels remote.",
    highlights: [
      "Dozens of small lakes within a short drive of camp",
      "Easy paddling that kids could handle",
      "Noticeably cooler than the valley below",
    ],
    watchouts: [
      "Afternoon thunderstorms rolled in most days — plan mornings on the water",
      "Mosquitoes were serious near the water at dusk",
      "Some lake-access spurs are rougher than the map suggests",
    ],
    lessonsLearned: [
      "Reserve developed sites early in August — they fill",
      "Pack layers; the temperature swing top-to-valley is big",
    ],
    safetyNotes: [
      "Get off exposed water before midday storms build",
      "Standard PFDs for everyone, even on tiny lakes",
    ],
    wouldReturn: true,
    rating: 5,
    sensitiveLocation: {
      level: "generalized",
      displayArea: "Mesa County, Colorado",
    },
    createdAt: "2025-08-12T20:15:00.000Z",
    updatedAt: "2025-08-12T20:15:00.000Z",
  },
  {
    id: "journal_taylor_park_plan",
    userId: USER_ID,
    slug: "taylor-park-summer-plan",
    title: "Taylor Park Summer Basecamp (Planning Notes)",
    tripZoneId: "taylor-park",
    tripName: "Taylor Park",
    status: "planned",
    visibility: "private",
    startDate: "2026-07-18",
    endDate: "2026-07-20",
    generalArea: "Gunnison County, Colorado",
    state: "CO",
    activities: ["dispersedCamping", "fishing", "overlanding", "hiking"],
    routeType: "mixed",
    routeSummary:
      "Plan is a dispersed basecamp with a mix of mellow forest-road exploring and " +
      "a fishing-focused day at the reservoir. Keeping it flexible around weather.",
    driveTimeHours: 4,
    difficulty: "intermediate",
    vehicleUsed: "4Runner; expect washboard and a few rough spurs",
    companions: "Solo or one friend (TBD)",
    notes:
      "Pre-trip notes to refine after I confirm current dispersed-camping rules " +
      "and fire restrictions with the ranger district.",
    highlights: [],
    watchouts: [
      "Popular area — arrive early on a Friday for a good dispersed spot",
      "Verify fire restrictions; they change fast mid-summer",
    ],
    lessonsLearned: [],
    safetyNotes: [
      "Confirm dispersed-camping and stay-limit rules before relying on them",
      "Carry extra fuel — services are limited once you're in",
    ],
    wouldReturn: undefined,
    sensitiveLocation: {
      level: "generalized",
      displayArea: "Gunnison County, Colorado",
      redactionReason:
        "Heavily used area — keeping specific spots general to avoid adding pressure.",
    },
    createdAt: "2026-04-12T18:45:00.000Z",
    updatedAt: "2026-04-12T18:45:00.000Z",
  },
];
