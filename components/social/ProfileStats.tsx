import type { ProfileStats as ProfileStatsType } from "@/lib/socialTypes";

/*
 * The four numbers that define a WanderMate identity: what they've actually
 * done, what they've saved, how far they've ranged, and their go-to activity.
 */
export function ProfileStats({ stats }: { stats: ProfileStatsType }) {
  const tiles: { label: string; value: string | number }[] = [
    { label: "Trips taken", value: stats.tripsTakenCount },
    { label: "Saved trips", value: stats.savedTripsCount },
    { label: "States explored", value: stats.statesExploredCount },
    { label: "Favorite activity", value: stats.favoriteActivity || "—" },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-xl border border-basecamp-700/70 bg-basecamp-900/50 px-4 py-3"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-basecamp-600">
            {t.label}
          </dt>
          <dd className="mt-1 text-lg font-bold leading-tight text-sand-50">
            {t.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
