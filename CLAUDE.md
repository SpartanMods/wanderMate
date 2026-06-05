# WanderMate — Claude Code Context

## Active Implementation Plan
`docs/superpowers/plans/2026-06-04-wandermate-phase1.md`

Read this file first. It contains all 11 Phase 1 tasks, step-by-step with code.

## Phase 1 Progress

| # | Task | Status |
|---|---|---|
| 1 | Expand ActivityKey (kayaking/canoeing/motorBoating/lakeAccess/golf/dining), open `state` to `string`, add `coordinates` to TripZone | ✅ Done |
| 2 | Season hard-fail + OHV legality hard constraint in `hasHardConstraintViolation` | ✅ Done |
| 3 | Supabase CLI, schema migrations, zones seed (24 zones in DB) | ✅ Done |
| 4 | Supabase browser + server clients, DB types, middleware | 🔜 Next |
| 5 | URL hash preference state (replace localStorage) | ⬜ Pending |
| 6 | Results page rebuilt (5–7 zones, user-select comparison) | ⬜ Pending |
| 7 | Public zone detail pages `/zones/[id]` | ⬜ Pending |
| 8 | Live conditions layer (Weather.gov + fire restrictions) | ⬜ Pending |
| 9 | Auth pages (login, magic link, Google OAuth, callback) | ⬜ Pending |
| 10 | Save Trip + Field Report CRUD + dashboard | ⬜ Pending |
| 11 | Profile baseline preferences pre-fill planner form | ⬜ Pending |

## Key Decisions Made
- **Backend:** Supabase (project ref: `icnsvugpozauxpicbuhq`)
- **Auth:** Email/password + magic link + Google OAuth
- **URL state:** Opaque base64 hash (`/results?p=<hash>`)
- **Zones:** Static `data/tripZones.ts` for Phase 1 reads; also seeded to Supabase `zones` table
- **Field Reports:** Renamed from "journal entries" — private by default
- **Monetization:** Freemium; pro tier gates saved trips, field reports, offline cards
- **Test runner:** Node built-in `node:test` — run individual files: `node --import ./scripts/register-loader.mjs --test lib/<file>.test.ts`

## Supabase Schema (applied)
- `profiles` — auto-created on signup, stores baseline_preferences + is_pro
- `zones` — 24 zones seeded, PostGIS geometry column, public read
- `preference_snapshots` — opaque UUID → TripPreferences JSON
- `saved_trips` — pro feature, RLS user-scoped
- `field_reports` — pro feature, RLS user-scoped, is_public default false

## Env Vars Needed
Copy `.env.local.example` → `.env.local` and fill in Supabase URL + keys.
