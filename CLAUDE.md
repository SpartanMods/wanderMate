# WanderMate — Claude Code Context

## Active Implementation Plan
The Phase 1 spec is the PRD in GitHub issue #7. (The plan file previously
referenced here, `docs/superpowers/plans/2026-06-04-wandermate-phase1.md`,
was never committed to the repo.)

## ⚠️ External API Access Required — see issue #20
Claude Code cloud sessions currently block every external API the app uses
(weather.gov, USFS, BLM, RIDB, Supabase, Nominatim). This is **very important**:
it blocks verifying the fire data (#11) and Tasks 9–11 (Supabase). Unlock steps
are in #20 and its sub-tickets #21–#26. Until then, do not guess at upstream
schemas — use fixtures and say what is unverified.

## Phase 1 Progress

| # | Task | Status |
|---|---|---|
| 1 | Expand ActivityKey (kayaking/canoeing/motorBoating/lakeAccess/golf/dining), open `state` to `string`, add `coordinates` to TripZone | ✅ Done |
| 2 | Season hard-fail + OHV legality hard constraint in `hasHardConstraintViolation` | ✅ Done |
| 3 | Supabase CLI, schema migrations, zones seed (24 zones in DB), verified via REST API | ✅ Done |
| 4 | Supabase browser + server clients, DB types, middleware | ✅ Done |
| 5 | URL hash preference state (replace localStorage) | ✅ Done |
| 6 | Results page rebuilt (5–7 zones, user-select comparison) | ✅ Done |
| 7 | Public zone detail pages `/zones/[id]` | ✅ Done |
| 8 | Live conditions layer (Weather.gov + fire restrictions) | 🟡 Shipped; fixes in progress (#11–#19) |
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
- **Live fire conditions (#13):** callouts + user filter (own `fire=` query param, hides nothing by default) + graduated ranking penalty (Stage 1 −5, Stage 2 −12, Closure −30, Unknown 0). Batch-fetch all eligible zones concurrently, show "Loading live data…", rank once after all settle. 10s timeout per request; weather.gov's two calls share one 10s limit. Timeout/error = unknown.
- **Missing must-have penalty (#19):** −10 per activity (was −20), cap stays −45
- **Task 8 fix order:** #14/#15/#17 → #12 → #11 → #18/#19 → #13/#16 → Task 9
- **Test runner:** Node built-in `node:test` — run individual files: `node --import ./scripts/register-loader.mjs --test lib/<file>.test.ts`

## Supabase Schema (applied)
- `profiles` — auto-created on signup, stores baseline_preferences + is_pro
- `zones` — 24 zones seeded, PostGIS geometry column, public read
- `preference_snapshots` — opaque UUID → TripPreferences JSON
- `saved_trips` — pro feature, RLS user-scoped
- `field_reports` — pro feature, RLS user-scoped, is_public default false

## Env Vars Needed
Copy `.env.local.example` → `.env.local` and fill in Supabase URL + keys.

## Coding Standards (required)

### Before making changes
- Inspect existing codebase: architecture, patterns, naming, dependencies, test setup
- Stop and ask if: multiple valid interpretations exist; a required file/component/API/schema/route/dependency is missing; the change may affect data models, auth, permissions, routing, scoring, persistence, or user-facing behavior; unsure whether to extend existing patterns or create new ones
- Do not silently choose a direction when the choice meaningfully affects the product

### TypeScript
- Strict, explicit types; avoid `any` (explain if used)
- Prefer typed interfaces, discriminated unions, Zod schemas, or inferred types
- Small, readable, purpose-driven functions
- Reuse existing utilities/types/constants/components before creating new ones
- No duplicated logic; no magic values (use named constants)
- Preserve project structure; no unnecessary dependencies
- Do not weaken linting, typing, validation, or error handling to make code pass

### Testing — truthful reporting only
After every change run: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`
- If a command fails: fix it or explain which failed, exact reason, whether caused by the change or pre-existing, what remains
- Never claim "tests pass / build clean / no issues" unless the command actually ran and succeeded

### Git safety
- Identify files to modify before editing; avoid unrelated files
- No reformatting large files unless formatting is the task
- No env files, secrets, credentials, or deployment settings without explicit permission

### End-of-task summary
Every completed task must include:
- **Changes made** — files and what changed in each
- **Functionality added or updated** — what the user can now do / how it works
- **Validation performed** — every command run and its result
