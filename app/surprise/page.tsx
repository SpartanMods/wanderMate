"use client";

import { useState } from "react";
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

export default function SurprisePage() {
  const [form, setForm] = useState<MiniForm>(DEFAULTS);
  const [result, setResult] = useState<{
    primary: TripRecommendation;
    backups: TripRecommendation[];
    explanation: string;
  } | null>(null);

  function set<K extends keyof MiniForm>(key: K, value: MiniForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function roll(e?: React.FormEvent) {
    e?.preventDefault();
    setResult(getRandomTripRecommendation(toPreferences(form), tripZones));
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
          <Field label="Starting location">
            <input
              className="input-base"
              value={form.startingLocation}
              onChange={(e) => set("startingLocation", e.target.value)}
              placeholder="Denver, CO"
            />
          </Field>
          <Field label="Max drive time" hint="Estimated from Denver in v1.">
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

        <Button type="submit" size="lg" className="w-full sm:w-auto">
          {result ? "🎲 Roll again" : "🎲 Surprise me"}
        </Button>
      </form>

      {result && (
        <div className="space-y-5">
          <SafetyNotice />
          <SurprisePrimaryCard
            rec={result.primary}
            explanation={result.explanation}
          />

          {result.backups.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-bold text-sand-50">
                Backup options
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {result.backups.map((b) => (
                  <SurpriseBackupCard key={b.trip.id} rec={b} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => roll()} variant="secondary">
              🎲 Roll again
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
