import type { TripZone } from "@/lib/types";

export function ZoneLegalRemote({ zone }: { zone: TripZone }) {
  const lg = zone.legality;
  const rm = zone.remoteness;
  return (
    <section className="card p-6 space-y-4">
      <h2 className="text-lg font-bold text-sand-50">Legality &amp; Remoteness</h2>
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-sand-200/60">Dispersed camping</dt>
          <dd className="font-medium text-sand-50 capitalize">
            {lg.dispersedCampingAllowed}
          </dd>
        </div>
        <div>
          <dt className="text-sand-200/60">OHV legal</dt>
          <dd className="font-medium text-sand-50 capitalize">
            {lg.ohvLegal.replace("_", " ")}
          </dd>
        </div>
        <div>
          <dt className="text-sand-200/60">Permit likely</dt>
          <dd className="font-medium text-sand-50">
            {lg.permitLikelyRequired ? "Yes — verify" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-sand-200/60">Campfire restrictions</dt>
          <dd className="font-medium text-sand-50">
            {lg.campfireRestrictionsCommon ? "Common" : "Not typical"}
          </dd>
        </div>
        <div>
          <dt className="text-sand-200/60">Nearest town</dt>
          <dd className="font-medium text-sand-50">{rm.nearestTown}</dd>
        </div>
        <div>
          <dt className="text-sand-200/60">Cell service</dt>
          <dd className="font-medium text-sand-50">{rm.cellServiceLikelihood}/5</dd>
        </div>
        {rm.fuelDistanceMilesEstimate != null && (
          <div>
            <dt className="text-sand-200/60">Fuel distance</dt>
            <dd className="font-medium text-sand-50">
              ~{rm.fuelDistanceMilesEstimate} mi
            </dd>
          </div>
        )}
        <div>
          <dt className="text-sand-200/60">Water availability</dt>
          <dd className="font-medium text-sand-50 capitalize">
            {rm.waterAvailability}
          </dd>
        </div>
      </dl>
    </section>
  );
}
