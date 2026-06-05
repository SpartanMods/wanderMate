import type { LiveConditions } from "@/lib/conditions";

/** Full conditions display — used on zone detail pages. */
export function LiveConditionsBadge({
  conditions,
}: {
  conditions: LiveConditions | null;
}) {
  if (!conditions) {
    return (
      <p className="text-xs text-sand-200/40">
        Conditions unavailable. Verify before you go.
      </p>
    );
  }

  const { weather, fire, nearbyFacilities } = conditions;
  const hasAnyData = weather || fire || nearbyFacilities.length > 0;

  if (!hasAnyData) {
    return (
      <p className="text-xs text-sand-200/40">
        Conditions unavailable. Verify before you go.
      </p>
    );
  }

  return (
    <section className="card p-5 space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-sand-300">
        Live Conditions
      </h2>

      {fire?.hasActiveRestriction && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-600/40 bg-amber-900/20 px-3 py-2">
          <span className="mt-0.5 text-amber-400" aria-hidden>
            🔥
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-200">
              Fire restriction active
              {fire.restrictionLevel ? ` — ${fire.restrictionLevel}` : ""}
            </p>
            {fire.affectedArea && (
              <p className="text-xs text-amber-200/70">{fire.affectedArea}</p>
            )}
            <p className="text-xs text-amber-200/50 mt-0.5">
              Source: {fire.source === "usfs" ? "USFS" : "BLM"}
            </p>
          </div>
        </div>
      )}

      {fire && !fire.hasActiveRestriction && (
        <p className="flex items-center gap-1.5 text-sm text-sand-200/70">
          <span className="text-moss-400" aria-hidden>
            ✓
          </span>
          No active fire restrictions in this area
          <span className="text-xs text-sand-200/40 ml-1">
            ({fire.source === "usfs" ? "USFS" : "BLM"})
          </span>
        </p>
      )}

      {weather && (
        <div className="flex items-center gap-2 text-sm text-sand-200/80">
          <span aria-hidden>🌤</span>
          <span>
            {weather.shortForecast} · {weather.temperature}°
            {weather.temperatureUnit}
          </span>
          {weather.windSpeed && (
            <span className="text-sand-200/50">· {weather.windSpeed} winds</span>
          )}
        </div>
      )}

      {nearbyFacilities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-sand-300 mb-1">
            Nearby recreation areas
          </p>
          <ul className="space-y-0.5">
            {nearbyFacilities.slice(0, 4).map((f) => (
              <li
                key={f.facilityId}
                className="flex items-center gap-2 text-xs text-sand-200/70"
              >
                <span
                  className={
                    f.status === "Closed"
                      ? "text-rust-400"
                      : f.status === "Limited"
                        ? "text-amber-400"
                        : "text-moss-400"
                  }
                  aria-hidden
                >
                  {f.status === "Closed" ? "✗" : f.status === "Limited" ? "~" : "·"}
                </span>
                {f.facilityName}
                {f.status && (
                  <span className="text-sand-200/40">({f.status})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-sand-200/30">
        Updated {new Date(conditions.fetchedAt).toLocaleTimeString()} · Always
        verify with land managers before travel.
      </p>
    </section>
  );
}

/** Compact inline badge for result cards. */
export function LiveConditionsCompact({
  conditions,
  loading,
}: {
  conditions: LiveConditions | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <span className="text-xs text-sand-200/30 animate-pulse">
        Loading conditions…
      </span>
    );
  }
  if (!conditions) {
    return (
      <span className="text-xs text-sand-200/30">Conditions unavailable</span>
    );
  }

  const { weather, fire } = conditions;

  return (
    <span className="flex flex-wrap items-center gap-3 text-xs text-sand-200/70">
      {fire?.hasActiveRestriction && (
        <span className="flex items-center gap-1 text-amber-300 font-medium">
          🔥 {fire.restrictionLevel ?? "Fire restriction"}
        </span>
      )}
      {weather && (
        <span>
          {weather.shortForecast} · {weather.temperature}°
          {weather.temperatureUnit}
        </span>
      )}
    </span>
  );
}
