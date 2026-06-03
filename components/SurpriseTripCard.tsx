import { Badge } from "./Badge";
import { DataQualitySummary } from "./DataQuality";
import {
  ACTIVITY_LABELS,
  VEHICLE_LABELS,
} from "@/lib/constants";
import type { ActivityKey, TripRecommendation } from "@/lib/types";
import { formatDriveTime, titleCase } from "@/lib/utils";

function topActivities(trip: TripRecommendation["trip"], n = 4): string[] {
  return (Object.entries(trip.activities) as [ActivityKey, number][])
    .filter(([, v]) => v >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => ACTIVITY_LABELS[k]);
}

export function SurprisePrimaryCard({
  rec,
  explanation,
}: {
  rec: TripRecommendation;
  explanation: string;
}) {
  const { trip, score, qualityLabel } = rec;
  return (
    <article className="card overflow-hidden border-moss-500/50 ring-1 ring-moss-500/20">
      <div className="bg-gradient-to-br from-moss-900/40 to-basecamp-900 p-6">
        <div className="flex items-center gap-2">
          <Badge tone="moss" className="font-bold">
            🎲 Your surprise pick
          </Badge>
          <Badge tone="sand">{qualityLabel}</Badge>
          <span className="ml-auto text-2xl font-black text-sand-50">
            {score}
            <span className="text-sm font-medium text-basecamp-600">/100</span>
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-sand-50">
          {trip.name}
        </h2>
        <p className="text-sm text-sand-200/70">
          {trip.region} · {trip.state}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-sand-200/85">
          {trip.summary}
        </p>
      </div>

      <div className="p-6">
        <div className="rounded-xl border border-moss-600/30 bg-moss-900/15 p-3 text-sm text-sand-200/90">
          <span className="font-semibold text-moss-300">Why this one: </span>
          {explanation}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {topActivities(trip).map((a) => (
            <Badge key={a} tone="moss">
              {a}
            </Badge>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Drive" value={formatDriveTime(rec.effectiveDriveHours)} />
          <Stat label="Skill" value={titleCase(trip.skillLevel)} />
          <Stat label="Off-grid" value={`${trip.offGridLevel}/4`} />
          <Stat label="Vehicle" value={VEHICLE_LABELS[trip.vehicleRequirement]} />
        </div>

        <DataQualitySummary trip={trip} />

        {trip.watchouts.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-rust-300">
              Watchouts
            </h4>
            <ul className="space-y-1 text-sm text-sand-200/85">
              {trip.watchouts.map((w, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-rust-400" aria-hidden>
                    !
                  </span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

export function SurpriseBackupCard({ rec }: { rec: TripRecommendation }) {
  const { trip, score } = rec;
  return (
    <article className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-sand-50">{trip.name}</h3>
        <span className="text-lg font-black text-sand-100">{score}</span>
      </div>
      <p className="text-xs text-sand-200/60">
        {trip.region} · {trip.state}
      </p>
      <p className="mt-2 line-clamp-3 text-sm text-sand-200/80">{trip.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {topActivities(trip, 3).map((a) => (
          <Badge key={a} tone="neutral">
            {a}
          </Badge>
        ))}
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-basecamp-800 bg-basecamp-900/50 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-basecamp-600">
        {label}
      </div>
      <div className="text-sm font-semibold text-sand-100">{value}</div>
    </div>
  );
}
