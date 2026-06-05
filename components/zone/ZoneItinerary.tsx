import type { TripZone } from "@/lib/types";

export function ZoneItinerary({ zone }: { zone: TripZone }) {
  if (zone.suggestedItinerary.length === 0 && zone.backupOptions.length === 0) {
    return null;
  }
  return (
    <section className="card p-6 space-y-4">
      {zone.suggestedItinerary.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-sand-50">
            Suggested Itinerary
          </h2>
          <ol className="space-y-2">
            {zone.suggestedItinerary.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-sand-200/85">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded bg-moss-600/20 text-xs font-bold text-moss-300">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      )}
      {zone.backupOptions.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold text-sand-200">Backup options</h3>
          <ul className="space-y-1">
            {zone.backupOptions.map((b, i) => (
              <li key={i} className="text-sm text-sand-200/75">
                · {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
