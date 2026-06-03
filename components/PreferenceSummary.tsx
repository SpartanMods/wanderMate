import { Badge } from "./Badge";
import {
  ACTIVITY_LABELS,
  CAMPING_LABELS,
  CROWD_TOLERANCE_OPTIONS,
  OFF_GRID_OPTIONS,
  RISK_TOLERANCE_OPTIONS,
  VEHICLE_OPTIONS,
} from "@/lib/constants";
import type { ActivityKey, TripPreferences } from "@/lib/types";
import { formatDriveTime, inferSeason, titleCase } from "@/lib/utils";

function labelFor<T extends string | number>(
  options: { value: T; label: string }[],
  value: T
): string {
  return options.find((o) => o.value === value)?.label ?? String(value);
}

export function PreferenceSummary({ prefs }: { prefs: TripPreferences }) {
  const activities = Object.entries(prefs.selectedActivities) as [
    ActivityKey,
    string
  ][];
  const season = inferSeason(prefs.startDate);

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-sand-300">
          Your preferences
        </h2>
        <span className="text-xs text-basecamp-600">
          from {prefs.startingLocation}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="sand">Max {formatDriveTime(prefs.maxDriveTimeHours)}</Badge>
        <Badge tone="sand">{titleCase(prefs.experienceLevel)}</Badge>
        <Badge tone="sand">
          {labelFor(VEHICLE_OPTIONS, prefs.vehicleCapability)}
        </Badge>
        <Badge tone="sand">
          {labelFor(OFF_GRID_OPTIONS, prefs.offGridPreference)}
        </Badge>
        <Badge tone="sand">
          {labelFor(CROWD_TOLERANCE_OPTIONS, prefs.crowdTolerance)}
        </Badge>
        <Badge tone="sand">
          Risk: {labelFor(RISK_TOLERANCE_OPTIONS, prefs.riskTolerance)}
        </Badge>
        {prefs.campingPreference !== "either" && (
          <Badge tone="sand">
            {prefs.campingPreference === "none"
              ? "No camping"
              : CAMPING_LABELS[prefs.campingPreference]}
          </Badge>
        )}
        {season && <Badge tone="sand">{titleCase(season)} trip</Badge>}
      </div>

      {activities.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-sand-300">Activities</p>
          <div className="flex flex-wrap gap-2">
            {activities.map(([key, weight]) => (
              <Badge
                key={key}
                tone={
                  weight === "must_have"
                    ? "moss"
                    : weight === "important"
                      ? "rust"
                      : "neutral"
                }
              >
                {ACTIVITY_LABELS[key]}
                <span className="opacity-60">
                  · {weight === "must_have" ? "must" : weight === "important" ? "imp" : "nice"}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {prefs.mustAvoid.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-sand-300">Avoiding</p>
          <div className="flex flex-wrap gap-2">
            {prefs.mustAvoid.map((m) => (
              <Badge key={m} tone="rust">
                ✕ {m}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
