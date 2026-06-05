"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActivityWeightSelector } from "./ActivityWeightSelector";
import { Button } from "./Button";
import { ChipMultiSelect, Field, OptionGroup } from "./FormControls";
import {
  CAMPING_OPTIONS,
  CROWD_TOLERANCE_OPTIONS,
  DEFAULT_STARTING_LOCATION,
  DRIVE_TIME_OPTIONS,
  GEAR_OPTIONS,
  MUST_AVOID_OPTIONS,
  OFF_GRID_OPTIONS,
  RISK_TOLERANCE_OPTIONS,
  SKILL_LEVELS,
  VEHICLE_OPTIONS,
  VIBE_OPTIONS,
} from "@/lib/constants";
import { ORIGIN_PRESETS } from "@/lib/geo";
import { buildResultsUrl } from "@/lib/prefHash";
import type {
  ActivityKey,
  ActivityWeight,
  CampingType,
  SkillLevel,
  TripPreferences,
  VehicleRequirement,
} from "@/lib/types";
import { validatePreferences } from "@/lib/validation";

const DEFAULTS: TripPreferences = {
  startingLocation: DEFAULT_STARTING_LOCATION,
  maxDriveTimeHours: 4,
  startDate: undefined,
  endDate: undefined,
  selectedActivities: {},
  experienceLevel: "intermediate",
  offGridPreference: 2,
  crowdTolerance: 2,
  vehicleCapability: "suv",
  campingPreference: "either",
  riskTolerance: 2,
  vibes: [],
  mustAvoid: [],
  gear: [],
};

export function TripPreferenceForm() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<TripPreferences>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof TripPreferences>(
    key: K,
    value: TripPreferences[K]
  ) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  function toggleInArray(key: "vibes" | "mustAvoid" | "gear", value: string) {
    setPrefs((p) => {
      const arr = p[key];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...p, [key]: next };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = validatePreferences(prefs);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (Object.keys(prefs.selectedActivities).length === 0) {
      setError("Pick at least one activity so we can match you.");
      return;
    }

    router.push(buildResultsUrl(result.data));
  }

  const activityCount = Object.keys(prefs.selectedActivities).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Trip basics */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-sand-50">Trip basics</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Starting location"
            hint="Pick a regional hub to adjust drive times. Others fall back to Denver."
          >
            <input
              className="input-base"
              list="origin-presets"
              value={prefs.startingLocation}
              onChange={(e) => update("startingLocation", e.target.value)}
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
            hint="Drive time is estimated from your starting location."
          >
            <OptionGroup
              columns={3}
              options={DRIVE_TIME_OPTIONS}
              value={prefs.maxDriveTimeHours}
              onChange={(v) => update("maxDriveTimeHours", v)}
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              className="input-base"
              value={prefs.startDate ?? ""}
              onChange={(e) =>
                update("startDate", e.target.value || undefined)
              }
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              className="input-base"
              value={prefs.endDate ?? ""}
              min={prefs.startDate}
              onChange={(e) => update("endDate", e.target.value || undefined)}
            />
          </Field>
        </div>
      </section>

      {/* Activities */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sand-50">
            Activities &amp; weights
          </h2>
          <span className="text-xs text-basecamp-600">
            {activityCount} selected
          </span>
        </div>
        <ActivityWeightSelector
          value={prefs.selectedActivities}
          onChange={(v: Partial<Record<ActivityKey, ActivityWeight>>) =>
            update("selectedActivities", v)
          }
        />
      </section>

      {/* You & your rig */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-sand-50">You &amp; your rig</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Experience level">
            <OptionGroup
              options={SKILL_LEVELS}
              value={prefs.experienceLevel}
              onChange={(v: SkillLevel) => update("experienceLevel", v)}
            />
          </Field>
          <Field label="Vehicle capability">
            <OptionGroup
              options={VEHICLE_OPTIONS}
              value={prefs.vehicleCapability}
              onChange={(v: VehicleRequirement | "not_sure") =>
                update("vehicleCapability", v)
              }
            />
          </Field>
          <Field label="Off-grid preference">
            <OptionGroup
              columns={1}
              options={OFF_GRID_OPTIONS}
              value={prefs.offGridPreference}
              onChange={(v) => update("offGridPreference", v)}
            />
          </Field>
          <Field label="Crowd tolerance">
            <OptionGroup
              columns={1}
              options={CROWD_TOLERANCE_OPTIONS}
              value={prefs.crowdTolerance}
              onChange={(v) => update("crowdTolerance", v)}
            />
          </Field>
          <Field label="Camping preference">
            <OptionGroup
              options={CAMPING_OPTIONS}
              value={prefs.campingPreference}
              onChange={(v: CampingType | "either") =>
                update("campingPreference", v)
              }
            />
          </Field>
          <Field label="Risk tolerance">
            <OptionGroup
              columns={1}
              options={RISK_TOLERANCE_OPTIONS}
              value={prefs.riskTolerance}
              onChange={(v) => update("riskTolerance", v)}
            />
          </Field>
        </div>
      </section>

      {/* Vibe & filters */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-sand-50">Vibe &amp; filters</h2>
        <div className="space-y-5">
          <Field label="Vibe preference" hint="What should the trip feel like?">
            <ChipMultiSelect
              options={VIBE_OPTIONS}
              selected={prefs.vibes}
              onToggle={(v) => toggleInArray("vibes", v)}
            />
          </Field>
          <Field
            label="Must avoid"
            hint="Hard nopes. These actively penalize matching trips."
          >
            <ChipMultiSelect
              options={MUST_AVOID_OPTIONS}
              selected={prefs.mustAvoid}
              onToggle={(v) => toggleInArray("mustAvoid", v)}
            />
          </Field>
          <Field
            label="Gear available"
            hint="Helps us match trips you're actually equipped for."
          >
            <ChipMultiSelect
              options={GEAR_OPTIONS}
              selected={prefs.gear}
              onToggle={(v) => toggleInArray("gear", v)}
            />
          </Field>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rust-500/50 bg-rust-900/30 px-4 py-3 text-sm text-rust-100">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-basecamp-600">
          We score {""}
          {activityCount > 0 ? "your weighted activities" : "all activities"} against
          24 curated zones across CO, WY &amp; UT.
        </p>
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Find my trips →
        </Button>
      </div>
    </form>
  );
}
