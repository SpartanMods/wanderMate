# WanderMate

> **Find the right trip, not the same trip everyone else is taking.**

WanderMate is an outdoor adventure **decision engine** — not another map app. It
helps you decide *where to go* for camping, hiking, fishing, dirt biking,
overlanding, backpacking, scenic drives, and hidden-gem weekend trips based on
your location, skill level, vehicle, crowd tolerance, and appetite for getting
off-grid.

The MVP launch region is **Colorado, Wyoming, and Utah**, with **Denver** as the
default starting point.

---

## 1. What WanderMate is

The hard part of an outdoor trip isn't the map — it's the decision. Most outdoor
apps are great at *showing* places and weak at helping you decide which one
actually fits your situation. WanderMate turns scattered planning inputs
(location, drive time, dates, activities, skill, vehicle, vibe, must-avoids,
gear) into a ranked, explained set of recommendations. Every pick answers:

> *Where should I go, why does it fit me, how off-grid is it, what should I
> watch out for, and what's my backup plan?*

It also includes a **Surprise Me** mode that uses weighted randomness — random,
but still relevant.

## 2. How to run locally

Requires Node.js 18.17+ (tested on Node 22).

```bash
npm install
npm run dev      # start the dev server at http://localhost:3000
npm run dev:lan  # start the dev server on your local network for phone testing
```

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

For phone testing, the `/phone` helper route, and optional Playwright setup, see `docs/mobile-testing.md`.

## 3. Tech stack

- **Next.js 14** (App Router)
- **TypeScript** (strict)
- **Tailwind CSS** — dark, earth-toned, rugged design system
- **React 18**
- **Zod** — preference validation
- **React Hook Form** — available as a dependency for future form work
- **Local TypeScript seed data** — no database, no auth, no external APIs, no map
  dependency in v1

## 4. MVP features

- Landing page with the product promise and launch-region badge
- Trip planner form with **weighted activity selection** (nice-to-have /
  important / must-have)
- Transparent **0–100 scoring algorithm** with a per-dimension breakdown
- Ranked results page with a featured top pick and additional recommendations
- Match-score ring, quality labels, and plain-English "why it matches / why it
  might not" explanations
- **Hidden-gem ranking** and **popularity dampening**
- **Region diversity** logic so the top set isn't five versions of the same place
- Beginner / intermediate / advanced / expert **suitability logic**
- Off-grid, crowd, vehicle, camping, vibe, season, and gear matching
- **Origin-aware drive times** — pick a regional starting hub and every zone's
  drive time (and the drive-time score) recalculates relative to it
- Must-avoid filtering with penalties
- **Surprise Me** weighted-random mode (1 primary + 2 backups)
- Safety & verification notice on results, surprise, and detail sections
- Empty-state coaching that explains which constraints are too tight
- 24 curated trip zones across CO / WY / UT
- Fully mobile-responsive

## 5. Data model overview

Each location is a `TripZone` (see `lib/types.ts`). Key fields:

| Field | Meaning |
| --- | --- |
| `activities` | `Record<ActivityKey, number>` rated 0–5 |
| `skillLevel` / `minRecommendedSkill` | difficulty + floor |
| `offGridLevel` | 1 (accessible) → 4 (deep backcountry) |
| `crowdLevel` | 1 (empty) → 5 (busy) |
| `hiddenGemScore` / `popularityScore` | 1–5 each, drive the discovery logic |
| `vehicleRequirement` | `any_car` → `high_clearance_4x4` / `ohv` |
| `campingTypes` | developed / dispersed / backpacking |
| `driveTimeFromDenverHours` | Denver baseline; adjusted per chosen origin (see `lib/geo.ts`) |
| `bestSeasons`, `vibes`, `avoidFlags` | matching signals |
| `watchouts`, `safetyNotes`, `suggestedItinerary`, `backupOptions` | trip detail |
| `sourceLinks`, `dataConfidence` | provenance & honesty |

User input is a `TripPreferences` object; engine output is a
`TripRecommendation` containing a `ScoreBreakdown`.

> **No exact campsite coordinates.** Zones describe *general areas* only, to
> protect fragile/sensitive places.

## 6. Matching algorithm overview

`lib/scoring.ts` → `calculateTripScore(prefs, trip)` produces a transparent
0–100 score from these base weights (sum = 100):

| Dimension | Weight |
| --- | --- |
| Activity fit | 30 |
| Skill fit | 12 |
| Off-grid fit | 12 |
| Drive time fit | 10 |
| Vehicle fit | 10 |
| Crowd fit | 8 |
| Camping fit | 6 |
| Vibe fit | 5 |
| Season fit | 4 |
| Gear fit | 3 |

Then **penalties** are applied (must-avoid conflicts, missing must-have
activities, drive slightly over max, skill/vehicle stretch, crowded-when-quiet,
low data confidence) and a **hidden-gem boost / popularity dampening** is added.
The final score is clamped to 0–100.

**Hard constraints** (`hasHardConstraintViolation`) *exclude* a trip entirely —
drive time far over max, a beginner facing an advanced/expert zone, or a severe
vehicle mismatch (e.g. any-car vs. high-clearance-4x4).

`lib/matching.ts` → `getRecommendations(prefs, trips)` scores every zone, drops
hard violations, sorts by score, and **diversifies by region**
(`diversifyRecommendations`) so similar-scoring alternatives from new regions
get surfaced.

**Quality labels:** 90+ Excellent · 80–89 Strong · 70–79 Good · 60–69 Possible ·
<60 Weak.

## 7. How hidden-gem logic works

When the user **prefers quiet** (crowd tolerance ≥ 3), wants to be **off-grid**
(off-grid preference ≥ 3), or selects a rugged/remote vibe:

- High `hiddenGemScore` zones get boosted (+9 for a 5, +6 for a 4, +3 for a 3).
- Very **popular** zones get dampened (−10 for popularity 5, −5 for 4), and
  low-popularity zones get a small bump.

Crowd-tolerant users still get a *mild* discovery nudge, but famous places aren't
over-ranked unless they strongly satisfy the user's must-have activities.

## 8. How random trip mode works

`lib/randomTrip.ts` → `getRandomTripRecommendation(prefs, trips)`:

1. Score all trips, drop hard-constraint violations.
2. Keep trips with score ≥ 70; if fewer than three remain, relax to ≥ 60.
3. Compute a selection weight blending **match score (50%)**, **hidden-gem score
   (25%)**, **lower popularity (15%)**, and **region novelty (10%)**.
4. Weighted-random pick one **primary** trip.
5. Pick **two backups**, preferring different regions.
6. Return an explanation of why the trip was selected.

Random ≠ reckless: hard mismatches and weak fits are filtered out before the
draw.

## 9. How to add new trip zones

1. Open `data/tripZones.ts`.
2. Append a new object that satisfies the `TripZone` type in `lib/types.ts`
   (TypeScript will tell you if a field is missing or mistyped).
3. Rate all 15 activities 0–5, set skill/off-grid/crowd/gem/popularity, vehicle
   requirement, camping types, drive time from Denver, seasons, vibes, avoid
   flags, watchouts, safety notes, an itinerary, backups, source links, and a
   `dataConfidence`.
4. Use **general areas only** — never exact fragile coordinates.
5. Run `npm run typecheck` and `npm run build` to confirm everything compiles.

The scoring engine is data-driven, so new zones (and eventually new regions)
require no algorithm changes.

## 10. Known limitations

1. The MVP uses **manually curated seed data** (`dataConfidence` is marked on
   every zone — mostly `medium`).
2. The MVP does **not verify real-time conditions** (weather, fire, closures).
3. The MVP does **not include live maps**.
4. The MVP does **not include user accounts** or auth.
5. The MVP does **not include exact campsite coordinates** — general areas only.
6. **No real geocoding.** Drive times adjust for a curated set of regional
   origin hubs (Denver, Boulder, Fort Collins, Colorado Springs, Pueblo, Grand
   Junction, Cheyenne, Laramie, Salt Lake City, Moab) by modeling each trip as a
   geographic delta off the Denver baseline. Arbitrary addresses we don't
   recognize fall back to Denver-based times — true address geocoding is a
   future enhancement.
7. **Users must verify official conditions and regulations before going.**

## 11. Future enhancements

- Live weather, fire-restriction, and road-closure integrations
- Real starting-location geocoding & drive-time routing
- Official public-land data ingestion
- Saved trips, shareable trip pages, and user profiles
- Group trip planning and gear-checklist generation
- AI-generated itinerary narratives
- Optional map view and trip comparison
- User-submitted condition reports and regional trip packs

---

## Project structure

```
/app
  layout.tsx          # shell, header/nav, footer
  page.tsx            # landing page
  /planner/page.tsx   # trip planner form
  /results/page.tsx   # ranked recommendations
  /surprise/page.tsx  # Surprise Me
  globals.css
/components
  ActivityWeightSelector.tsx  RecommendationCard.tsx  PreferenceSummary.tsx
  TripPreferenceForm.tsx      ScoreBreakdown.tsx      SurpriseTripCard.tsx
  SafetyNotice.tsx  FormControls.tsx  Badge.tsx  Button.tsx
/lib
  types.ts  constants.ts  scoring.ts  matching.ts  geo.ts
  randomTrip.ts  validation.ts  storage.ts  utils.ts
/data
  tripZones.ts        # 24 curated seed zones
```

> ⚠️ **Safety:** WanderMate recommendations are planning aids, not verified
> real-time conditions. Always confirm weather, fire restrictions, road
> closures, camping rules, OHV legality, permits, and local regulations through
> official sources before you go.
