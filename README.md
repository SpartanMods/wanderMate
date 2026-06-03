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
```

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

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
| `sourceLinks`, `dataConfidence` | provenance & honesty (legacy) |
| `landManager` | governing agency (USFS / BLM / NPS / state / mixed / …) |
| `dataQuality` | **category-based** confidence + `lastReviewedAt` (see below) |
| `sensitiveLocationLevel` | how generalized the location is (`generalized` / `fragile` / …) |
| `roadAccess` | access difficulty, clearance, 4WD, trailer, winter risk |
| `legality` | dispersed-camping, fire, permit, OHV & plated-vehicle rules |
| `remoteness` | cell service, nearest town, fuel distance, water availability |
| `verificationLinks` | categorized official links to verify current conditions |

User input is a `TripPreferences` object; engine output is a
`TripRecommendation` containing a `ScoreBreakdown`.

> **No exact campsite coordinates.** Zones describe *general areas* only, to
> protect fragile/sensitive places.

### Data quality & honesty model

WanderMate's seed data is **manually curated, not live**. To keep that honest,
every zone carries a structured `dataQuality` object that rates confidence
**by category** — `overall`, `access`, `camping`, `activities`, `legality`,
and `seasonality` — each a `{ level: "high" | "medium" | "low"; notes }` pair,
plus a `lastReviewedAt` date. Key principles:

- **The app uses generalized trip zones only.** Locations are described as
  general areas, never exact campsites or coordinates.
- **Exact sensitive locations are intentionally protected.** Fragile or
  culturally sensitive places are kept deliberately coarse
  (`sensitiveLocationLevel`), and restricted areas withhold detail by design.
- **Data confidence is category-based**, not a single global flag. When a value
  is uncertain it is marked `medium`/`low` with a note explaining why, and
  legality fields use honest `area_specific` / `unknown` values rather than
  inventing exact rules.
- **Official conditions are not live.** Nothing in the app reflects real-time
  weather, fire restrictions, road status, or closures.
- **Users must verify** weather, road access, fire restrictions, camping
  legality, OHV legality, permits, and closures through the official
  `verificationLinks` (and the land manager) **before every trip.**

The UI surfaces this directly: each recommendation card shows overall / access /
legality confidence, the land manager, the last-reviewed date, a
sensitive-location note where applicable, and a compact "Verify before you go"
row. The expanded details add a full per-category breakdown plus road-access,
legality, and remoteness facts and categorized verification links.

## 6. Matching algorithm overview

`lib/scoring.ts` → `calculateTripScore(prefs, trip)` produces a transparent
0–100 score from these base weights (sum = 100):

| Dimension | Weight |
| --- | --- |
| Activity fit | 28 |
| Skill fit | 11 |
| Off-grid fit | 10 |
| Drive time fit | 9 |
| Vehicle fit | 9 |
| Risk fit | 9 |
| Crowd fit | 7 |
| Camping fit | 5 |
| Vibe fit | 5 |
| Season fit | 4 |
| Gear fit | 3 |

Then **penalties** are applied (must-avoid conflicts, missing must-have
activities, drive slightly over max, skill/vehicle stretch, crowded-when-quiet,
and **data-quality confidence**) and a **hidden-gem boost / popularity
dampening** is added. The final score is clamped to 0–100.

**Data-quality penalties** come from the structured `dataQuality` model and are
intentionally light so they nudge rather than dominate: overall `low` −6 /
`medium` −2, legality `low` −8 / `medium` −3 (weighted highest, since permit /
fire / OHV mistakes carry real consequences), and access `low` −5.

**Hard constraints** (`hasHardConstraintViolation`) *exclude* a trip entirely —
drive time far over max, a beginner facing an advanced/expert zone, a severe
vehicle mismatch (e.g. any-car vs. high-clearance-4x4), an extreme road
(difficulty 5 without a real 4x4, or a 4WD-required road below truck
capability), and — for genuinely **low-risk** users only — trips that are
extreme on *multiple* dimensions at once (deep backcountry *and*
advanced/expert terrain, or a must-have activity whose legality is unknown).

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

**Hidden-gem boosts are bounded by safety and data quality.** A boost is zeroed
out when there's a severe vehicle or skill mismatch, scaled down when the zone's
overall data confidence is low (×0.4) or medium (×0.85), and reduced again when
legality confidence is low (×0.6). Popularity dampening hits harder for users who
chose the strongest crowd-aversion setting. In short: discovery value can break a
tie, but it can never paper over a trip you can't safely reach, handle, or trust.

## 7b. Risk-aware scoring

WanderMate treats **risk tolerance** (1 = low-risk/easy access → 4 =
high-adventure) as a first-class scoring dimension, not just a label.

- **`riskFit` (9 pts)** compares a per-trip *risk index* to the user's comfort.
  The risk index blends off-grid level, skill demand, vehicle demand, road
  difficulty, winter-access risk (only when the trip dates fall in winter),
  cell-service likelihood, legality uncertainty, and data confidence. A trip
  within the user's comfort earns full credit; a trip riskier than they want is
  scaled down by the overshoot. High-adventure users only get full credit for
  remote/rough trips they can actually handle — a vehicle or skill mismatch caps
  the reward.
- **`riskPenalty`** is a small, capped, *separately shown* guardrail deduction
  applied to lower-risk users (tolerance 1–2) when a trip carries concrete
  hazards: winter access risk on a winter trip, weak cell service in a remote
  zone, unknown OHV legality, or deep backcountry when they asked for easy
  access.
- **Guardrails** (above) hard-block the genuinely unsafe combinations rather than
  merely docking points.

The net effect:

- **Low-risk preferences** surface accessible, lower-off-grid, better-verified,
  easier, better-cell-coverage trips, and filter out the extreme ones.
- **High-adventure preferences** can surface remote, rugged, hidden-gem trips —
  *provided* vehicle, skill, legality, and data quality line up.
- Explanations (`explainMatch`) call out **why the risk level fits or doesn't**
  and name specific concerns (rough access, low cell service, winter access,
  legality uncertainty, remoteness, vehicle stretch).

> **Risk scoring does not replace verification.** Even a high-adventure trip with
> a great risk fit still shows the data-quality, sensitive-location, and
> "verify before you go" notices. Risk fit tunes *ranking*; it never asserts that
> conditions are currently safe. Always confirm weather, fire, road, permit, OHV,
> and closure status through the official `verificationLinks` before any trip.

## 8. How random trip mode works

`lib/randomTrip.ts` → `getRandomTripRecommendation(prefs, trips)`:

1. Score all trips, drop hard-constraint violations.
2. Keep trips with score ≥ 70; if fewer than three remain, relax to ≥ 60.
3. **Respect risk tolerance:** for lower-risk users (tolerance 1–2), narrow to
   the *risk-safe* subset (good `riskFit`, no meaningful `riskPenalty`) as long
   as at least three such trips remain — so Surprise Me doesn't randomly hand a
   cautious user an extreme trip unless there's nothing calmer.
4. Compute a selection weight blending **match score (40%)**, **hidden-gem score
   (20%)**, **risk fit (15%)**, **lower popularity (15%)**, and **region novelty
   (10%)**.
5. Weighted-random pick one **primary** trip.
6. Pick **two backups**, preferring different regions.
7. Return an explanation of why the trip was selected.

Random ≠ reckless: hard mismatches, weak fits, and (for low-risk users)
risk-inappropriate trips are filtered out before the draw.

## 9. How to add new trip zones

1. Open `data/tripZones.ts`.
2. Append a new object that satisfies the `TripZone` type in `lib/types.ts`
   (TypeScript will tell you if a field is missing or mistyped).
3. Rate all 15 activities 0–5, set skill/off-grid/crowd/gem/popularity, vehicle
   requirement, camping types, drive time from Denver, seasons, vibes, avoid
   flags, watchouts, safety notes, an itinerary, backups, source links, and the
   data-quality fields: `landManager`, `sensitiveLocationLevel`, `roadAccess`,
   `legality`, `remoteness`, a `dataQuality` block (use the `cat()` helper and
   shared `NOTE`s), and categorized `verificationLinks` (use the `verify()`
   helper). Bias to `medium`/`low` confidence and `area_specific`/`unknown`
   legality when you are not certain — never invent exact conditions.
4. Use **general areas only** — never exact fragile coordinates.
5. Run `npm run typecheck` and `npm run build` to confirm everything compiles.

The scoring engine is data-driven, so new zones (and eventually new regions)
require no algorithm changes.

## 10. Known limitations

1. The MVP uses **manually curated seed data**. Every zone carries a
   category-based `dataQuality` rating (mostly `medium`) with last-reviewed
   dates — it is a planning aid, not verified conditions.
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
  DataQuality.tsx   SafetyNotice.tsx  FormControls.tsx  Badge.tsx  Button.tsx
/lib
  types.ts  constants.ts  scoring.ts  matching.ts  geo.ts
  dataQuality.ts  randomTrip.ts  validation.ts  storage.ts  utils.ts
/data
  tripZones.ts        # 24 curated seed zones
```

> ⚠️ **Safety:** WanderMate recommendations are planning aids, not verified
> real-time conditions. Always confirm weather, fire restrictions, road
> closures, camping rules, OHV legality, permits, and local regulations through
> official sources before you go.
