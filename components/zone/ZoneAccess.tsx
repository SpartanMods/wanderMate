import type { TripZone } from "@/lib/types";
import { VEHICLE_LABELS } from "@/lib/constants";

export function ZoneAccess({ zone }: { zone: TripZone }) {
  const ra = zone.roadAccess;
  return (
    <section className="card p-6 space-y-4">
      <h2 className="text-lg font-bold text-sand-50">Access &amp; Vehicle</h2>
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-sand-200/60">Vehicle required</dt>
          <dd className="font-medium text-sand-50">
            {VEHICLE_LABELS[zone.vehicleRequirement as keyof typeof VEHICLE_LABELS] ?? zone.vehicleRequirement}
          </dd>
        </div>
        <div>
          <dt className="text-sand-200/60">Road difficulty</dt>
          <dd className="font-medium text-sand-50">{ra.accessRoadDifficulty}/5</dd>
        </div>
        <div>
          <dt className="text-sand-200/60">4WD required</dt>
          <dd className="font-medium text-sand-50">
            {ra.fourWheelDriveRequired ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-sand-200/60">Trailer friendly</dt>
          <dd className="font-medium text-sand-50">
            {ra.trailerFriendly ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-sand-200/60">Drive from Denver</dt>
          <dd className="font-medium text-sand-50">
            ~{zone.driveTimeFromDenverHours} hrs
          </dd>
        </div>
        <div>
          <dt className="text-sand-200/60">Winter access risk</dt>
          <dd className="font-medium text-sand-50">{ra.winterAccessRisk}/5</dd>
        </div>
      </dl>

      {zone.watchouts.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-amber-200">Watchouts</h3>
          <ul className="space-y-1">
            {zone.watchouts.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-sand-200/80">
                <span className="text-amber-400" aria-hidden>→</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {zone.verificationLinks.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-sand-300">
            Verify before you go
          </h3>
          <ul className="space-y-1">
            {zone.verificationLinks.map((l, i) => (
              <li key={i}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-moss-300 hover:underline underline-offset-2"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
