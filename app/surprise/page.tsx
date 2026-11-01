"use client";

import { useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { Field, OptionGroup } from "@/components/FormControls";
import { SafetyNotice } from "@/components/SafetyNotice";
import {
  SurpriseBackupCard,
  SurprisePrimaryCard,
} from "@/components/SurpriseTripCard";
import tripZones from "@/data/tripZones";
import {
  ACTIVITIES,
  CROWD_TOLERANCE_OPTIONS,
  DEFAULT_STARTING_LOCATION,
  DRIVE_TIME_OPTIONS,
  OFF_GRID_OPTIONS,
  SKILL_LEVELS,
  VEHICLE_OPTIONS,
} from "@/lib/constants";
import { loadLiveConditions, type LiveDataResult } from "@/lib/conditions/client";
import { fireStatusOf } from "@/lib/conditions/fireStatus";
import { ORIGIN_PRESETS, resolveOrigin } from "@/lib/geo";
import { getEligibleZones, type FireStatusByZone } from "@/lib/matching";
import { getRandomTripRecommendation } from "@/lib/randomTrip";
import type {
  ActivityKey,
  SkillLevel,
  TripPreferences,
  TripRecommendation,
  VehicleRequirement,
} from "@/lib/types";

type MiniForm = {
  startingLocation: string;
  maxDriveTimeHours: number;
  mainActivity: ActivityKey;
  experienceLevel: SkillLevel;
  vehicleCapability: VehicleRequirement | "not_sure";
  offGridPreference: 1 | 2 | 3 | 4;
  crowdTolerance: 1 | 2 | 3 | 4;
};

const DEFAULTS: MiniForm = {
  startingLocation: DEFAULT_STARTING_LOCATION,
  maxDriveTimeHours: 5,
  mainActivity: "dispersedCamping",
  experienceLevel: "intermediate",
  vehicleCapability: "suv",
  offGridPreference: 3,
  crowdTolerance: 3,
};

function toPreferences(f: MiniForm): TripPreferences {
  return {
    startingLocation: f.startingLocation,
    maxDriveTimeHours: f.maxDriveTimeHours,
    selectedActivities: { [f.mainActivity]: "must_have" },
    experienceLevel: f.experienceLevel,
    offGridPreference: f.offGridPreference,
    crowdTolerance: f.crowdTolerance,
    vehicleCapability: f.vehicleCapability,
    campingPreference: "either",
    riskTolerance: 2,
    vibes: [],
    mustAvoid: [],
    gear: [],
  };
}

type SurpriseResult = {
  primary: TripRecommendation;
  backups: TripRecommendation[];
  explanation: string;
  live: LiveDataResult;
  /** Zone ids we requested live data for. */
  lookedUp: Set<string>;
};

export default function SurprisePage() {
  const [form, setForm] = useState<MiniForm>(DEFAULTS);
  const [result, setResult] = useState<SurpriseResult | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  // Re-rolls with the same eligible zones reuse the live data already loaded.
  const liveCache = useRef<{ key: string; live: LiveDataResult } | null>(null);

  function set<K extends keyof MiniForm>(key: K, value: MiniForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function roll(e?: React.FormEvent) {
    e?.preventDefault();
    if (loadingLive) return;
    const prefs = toPreferences(form);
    const ids = getEligibleZones(prefs, tripZones).map((z) => z.id);
    const key = ids.join(",");

    let live = liveCache.current?.key === key ? liveCache.current.live : null;
    if (!live) {
      setLoadingLive(true);
      live = await loadLiveConditions(ids);
      setLoadingLive(false);
      // Don't reuse a failed load; the next roll retries.
      liveCache.current = live.failed ? null : { key, live };
    }

    const conditions = live.conditions;
    const fireByZone: FireStatusByZone = Object.fromEntries(
      ids.map((id) => [id, fireStatusOf(conditions[id])])
    );
    setResult({
      ...getRandomTripRecommendation(prefs, tripZones, fireByZone),
      live,
      lookedUp: new Set(ids),
    });
  }

  /** undefined for zones we never looked up (e.g. last-resort picks outside the eligible set). */
  function conditionsFor(rec: TripRecommendation) {
    if (!result || !result.lookedUp.has(rec.trip.id)) return undefined;
    return result.live.conditions[rec.trip.id] ?? null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-sand-50">
          🎲 Surprise Me
        </h1>
        <p className="mt-2 max-w-2xl text-sand-200/80">
          Set a few guardrails and we&apos;ll roll a weighted-random pick —
          surprising, but still relevant. Random doesn&apos;t mean reckless: hard
          mismatches are filtered out first.
        </p>
      </div>

      <form onSubmit={roll} className="card space-y-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Starting location"
            hint="Pick a hub to adjust drive times; others fall back to Denver."
          >
            <input
              className="input-base"
              list="origin-presets"
              value={form.startingLocation}
              onChange={(e) => set("startingLocation", e.target.value)}
              placeholder="Denver, CO"
            />
            <datalist id="origin-presets">
              {ORIGIN_PRESETS.map((o) => (
                <option key={o.id} value={o.label} />
              ))}
            </datalist>
          </Field>
          <Field
            label="Max drive time"
            hint="Estimated from your starting location."
          >
            <OptionGroup
              columns={3}
              options={DRIVE_TIME_OPTIONS}
              value={form.maxDriveTimeHours}
              onChange={(v) => set("maxDriveTimeHours", v)}
            />
          </Field>
          <Field label="Main activity">
            <select
              className="input-base"
              value={form.mainActivity}
              onChange={(e) =>
                set("mainActivity", e.target.value as ActivityKey)
              }
            >
              {ACTIVITIES.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Experience level">
            <OptionGroup
              options={SKILL_LEVELS}
              value={form.experienceLevel}
              onChange={(v: SkillLevel) => set("experienceLevel", v)}
            />
          </Field>
          <Field label="Vehicle capability">
            <OptionGroup
              options={VEHICLE_OPTIONS}
              value={form.vehicleCapability}
              onChange={(v: VehicleRequirement | "not_sure") =>
                set("vehicleCapability", v)
              }
            />
          </Field>
          <Field label="Off-grid preference">
            <OptionGroup
              columns={1}
              options={OFF_GRID_OPTIONS}
              value={form.offGridPreference}
              onChange={(v) => set("offGridPreference", v)}
            />
          </Field>
          <Field label="Crowd tolerance">
            <OptionGroup
              columns={1}
              options={CROWD_TOLERANCE_OPTIONS}
              value={form.crowdTolerance}
              onChange={(v) => set("crowdTolerance", v)}
            />
          </Field>
        </div>

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loadingLive}>
          {loadingLive ? "Loading live data…" : result ? "🎲 Roll again" : "🎲 Surprise me"}
        </Button>
      </form>

      {result && (
        <div className="space-y-5">
          <SafetyNotice />
          {result.live.failed && (
            <p
              className="rounded-xl border border-amber-600/40 bg-amber-900/15 px-4 py-3 text-sm text-amber-100"
              role="status"
            >
              Live conditions couldn&apos;t be loaded, so fire restrictions weren&apos;t
              considered in this pick. Verify restrictions locally before you go.
            </p>
          )}
          <SurprisePrimaryCard
            rec={result.primary}
            explanation={result.explanation}
            conditions={conditionsFor(result.primary)}
          />

          {result.backups.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-bold text-sand-50">
                Backup options
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {result.backups.map((b) => (
                  <SurpriseBackupCard key={b.trip.id} rec={b} conditions={conditionsFor(b)} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => roll()} variant="secondary" disabled={loadingLive}>
              {loadingLive ? "Loading live data…" : "🎲 Roll again"}
            </Button>
            <ButtonLink href="/planner" variant="ghost">
              Plan a full trip instead
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
