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
| 8 | Live conditions layer (Weather.gov + fire restrictions) | 🟡 Nearly done — done: #12 #13 #14 #15 #16 #17 #18 #19 #30 · open: #11 #28 (both blocked on API access, #20) |
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
- **Live fire conditions (#13):** callouts + user filter (own `fire=` query param, hides nothing by default) + graduated ranking penalty (Stage 1 −5, Stage 2 (partial, i.e. with exemptions like gas stoves) −7.5, Stage 2 −12, Stage 3 / Closure −30, Unknown 0). BLM fire check is disabled (`BLM_CHECK_ENABLED`) until #11 lands. Batch-fetch all eligible zones concurrently, show "Loading live data…", rank once after all settle. 10s timeout per request; weather.gov's two calls share one 10s limit. Timeout/error = unknown.
- **Missing must-have penalty (#19):** −10 per activity (was −20), cap stays −45
- **Results list (#29):** no score cutoff — every zone passing the hard constraints is shown (up to 7), ranked; per-card quality labels flag weak matches. Closest-match fallback only when nothing passes the hard constraints.
- **Preferences in URLs (#18):** `decodePrefs` validates with the Zod schema; activity keys limited to the known list.
- **Supabase env (#30):** middleware passes through when Supabase env vars are missing; protected routes (Task 9+) must deny access themselves when Supabase is unavailable.
- **Fire penalty strength (#13):** confirmed by the owner as-is. Scores cluster tightly, so Stage 1 moves a #1 zone to ~#7, Stage 2 to ~#14 — intended. An active restriction with an unreadable level is the `restriction` status (penalized as Stage 1).
- **Surprise Me (#33):** loads live conditions and applies the same fire penalties via the shared `buildRecommendation` in `lib/matching.ts`.
- **Single eligibility rule:** `getEligibleZones()` in `lib/matching.ts` — use it anywhere zones are filtered by hard constraints.
- **Test runner:** Node built-in `node:test` — run individual files: `node --import ./scripts/register-loader.mjs --test lib/<file>.test.ts`

## Next Steps (handoff — start here)

State as of PR #33 (merged): Task 8 is functionally complete; everything that
could be done without external network access is done. `main` passes lint,
typecheck, 109/109 tests, and build.

1. **Unblock API access (owner action, required first)** — #20 and sub-issues #21–#26.
   The Claude Code cloud environment blocks every external host. In the Claude
   desktop app or claude.ai/code (not mobile): session title bar → cloud
   environment menu → Edit → Network access (Limited) → add allowed domains
   `icnsvugpozauxpicbuhq.supabase.co`, `api.weather.gov`, `apps.fs.usda.gov`,
   `gis.blm.gov`, `ridb.recreation.gov` (keep "Allow package managers" ticked),
   and add env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `RIDB_API_KEY`. Alternative: run Claude locally / via Remote Control in a
   checkout that has `.env.local`. Never paste keys into chat or commit them.
   Verify with `node scripts/verify-db.mjs` (reads the `zones` table; it reads
   only `.env.local`, which is gitignored — in the cloud, either create it from
   the env vars or query `$NEXT_PUBLIC_SUPABASE_URL/rest/v1/zones` with the anon
   key) and close #25; close each host sub-issue once a request to it succeeds.
2. **#11 — fix the BLM fire source.** `fetchBlmClosures` in
   `lib/conditions/fireRestrictions.ts` queries a land-boundaries layer and is
   disabled via `BLM_CHECK_ENABLED = false`. Find the real BLM fire-restriction
   layer, verify its field list from `<layer>?f=json`, validate responses
   (schema mismatch ⇒ unknown, never "no restriction"), re-enable the flag.
   Also verify the USFS field names (`RESTRICTI1`, `UNITNAME`, `FORESTNAME`,
   `STAGE`) and make `LiveConditions.hasError` meaningful (adapters currently
   swallow errors, so it is never true).
3. **#28 — record real API responses** as fixtures in
   `lib/conditions/__fixtures__/` to replace the synthetic ones (header comment
   marks them synthetic). Strip API keys. If a real response doesn't match an
   adapter, file a bug rather than bending the fixture.
4. **Task 9 — auth** (login, magic link, Google OAuth, callback) per the PRD
   (#7). Note from #30: the middleware passes through when Supabase env vars
   are missing, so protected routes must deny access themselves when Supabase
   is unavailable. Use `requireSupabaseEnv()` / `getSupabaseEnv()` from
   `lib/supabase/env.ts`.
5. Then Task 10 (Save Trip + Field Reports, pro-gated) and Task 11 (profile
   baseline preferences pre-fill the planner).

**Workflow conventions used so far:** one branch + PR per ticket group
(`claude/<topic>`), squash-merge, PR body lists Changes / Functionality /
Validation, and every decision is recorded as a comment on the relevant issue
(see #13 for the fire-ranking decision log). No CI exists — run the four
checks locally before pushing. For browser checks, `npx next start` works
without Supabase env vars; Chromium is at
`/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
in the cloud container (use `playwright-core`).

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
