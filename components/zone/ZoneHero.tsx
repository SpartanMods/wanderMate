import type { TripZone } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { ACTIVITIES } from "@/lib/constants";

export function ZoneHero({ zone }: { zone: TripZone }) {
  const topActivities = ACTIVITIES.filter(
    (a) => (zone.activities[a.key] ?? 0) >= 4
  ).map((a) => a.label);

  return (
    <section className="rounded-2xl border border-basecamp-700/70 bg-gradient-to-b from-basecamp-850 to-basecamp-950 px-6 py-10">
      <div className="mb-2 flex flex-wrap gap-2">
        <Badge tone="neutral">{zone.region}</Badge>
        <Badge tone="neutral">{zone.state}</Badge>
        {zone.bestSeasons.map((s) => (
          <Badge key={s} tone="moss">
            {s}
          </Badge>
        ))}
      </div>
      <h1 className="text-3xl font-black text-sand-50">{zone.name}</h1>
      <p className="mt-3 max-w-2xl text-sand-200/85">{zone.summary}</p>
      {topActivities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {topActivities.map((a) => (
            <Badge key={a} tone="neutral">
              {a}
            </Badge>
          ))}
        </div>
      )}
      {zone.vibes.length > 0 && (
        <p className="mt-3 text-sm text-sand-200/60">
          Vibes: {zone.vibes.join(" · ")}
        </p>
      )}
    </section>
  );
}
