/*
 * Data-quality UI for WanderMate.
 *
 * Two surfaces, kept deliberately separate so the recommendation card stays
 * readable:
 *  - <DataQualitySummary>  compact row for the card body (confidence, manager,
 *                          last-reviewed, sensitive-location flag, verify row)
 *  - <DataQualityDetails>  full breakdown for the expanded details section
 *                          (every category, road/legality/remoteness facts,
 *                          categorized verification links)
 */

import { Badge } from "./Badge";
import {
  LAND_MANAGER_LABELS,
  VERIFICATION_CATEGORY_LABELS,
  confidenceTone,
  formatConfidenceLabel,
  formatReviewedDate,
  getDataQualityWarnings,
  getVerificationSummary,
  sensitiveLocationNote,
} from "@/lib/dataQuality";
import type {
  ConfidenceCategory,
  ConfidenceLevel,
  TripZone,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function ConfidenceBadge({
  label,
  level,
  title,
}: {
  label: string;
  level: ConfidenceLevel;
  title?: string;
}) {
  return (
    <Badge tone={confidenceTone(level)} title={title}>
      {label}: {level}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Compact summary — lives in the card body
// ---------------------------------------------------------------------------

export function DataQualitySummary({ trip }: { trip: TripZone }) {
  const dq = trip.dataQuality;
  const sensitive =
    trip.sensitiveLocationLevel === "fragile" ||
    trip.sensitiveLocationLevel === "restricted"
      ? sensitiveLocationNote(trip.sensitiveLocationLevel)
      : null;
  const summary = getVerificationSummary(trip);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceBadge
          label="Data"
          level={dq.overall.level}
          title={dq.overall.notes}
        />
        <ConfidenceBadge
          label="Access"
          level={dq.access.level}
          title={dq.access.notes}
        />
        <ConfidenceBadge
          label="Legality"
          level={dq.legality.level}
          title={dq.legality.notes}
        />
        <span className="text-xs text-basecamp-600">
          {LAND_MANAGER_LABELS[trip.landManager]} · reviewed{" "}
          {formatReviewedDate(dq.lastReviewedAt)}
        </span>
      </div>

      {sensitive && (
        <p className="flex items-start gap-1.5 text-xs leading-snug text-amber-200/90">
          <span aria-hidden className="mt-px text-amber-400">
            ◆
          </span>
          <span>{sensitive}</span>
        </p>
      )}

      {summary.totalWarnings > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs text-sand-200/70">
          <span className="font-semibold text-rust-300">⚑ Verify:</span>
          {summary.topWarnings.map((w, i) => (
            <span key={i}>
              {w}
              {i < summary.topWarnings.length - 1 ? " ·" : ""}
            </span>
          ))}
          {summary.totalWarnings > summary.topWarnings.length && (
            <span className="text-basecamp-600">
              +{summary.totalWarnings - summary.topWarnings.length} more
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full details — lives in the expanded section
// ---------------------------------------------------------------------------

function ConfidenceDot({ level }: { level: ConfidenceLevel }) {
  const color =
    level === "high"
      ? "bg-moss-400"
      : level === "medium"
        ? "bg-sand-400"
        : "bg-rust-400";
  return (
    <span
      aria-hidden
      className={cn("mt-1.5 h-2 w-2 flex-none rounded-full", color)}
    />
  );
}

function CategoryRow({
  label,
  category,
}: {
  label: string;
  category: ConfidenceCategory;
}) {
  return (
    <div className="flex gap-2.5">
      <ConfidenceDot level={category.level} />
      <div>
        <div className="text-xs font-semibold text-sand-100">
          {label}
          <span className="ml-1.5 font-normal text-basecamp-600">
            {formatConfidenceLabel(category.level)}
          </span>
        </div>
        <p className="text-xs leading-snug text-sand-200/70">
          {category.notes}
        </p>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-basecamp-800/60 py-1 last:border-0">
      <span className="text-xs text-basecamp-600">{label}</span>
      <span className="text-right text-xs font-medium text-sand-100">
        {value}
      </span>
    </div>
  );
}

const CLEARANCE_LABELS = {
  none: "No clearance needed",
  low_clearance: "Low clearance",
  moderate_clearance: "Moderate clearance",
  high_clearance: "High clearance",
} as const;

const YES_NO_AREA = {
  yes: "Yes",
  no: "No",
  seasonal: "Seasonal",
  area_specific: "Area-specific",
  unknown: "Unknown",
} as const;

const WATER_LABELS = {
  reliable: "Reliable",
  seasonal: "Seasonal",
  limited: "Limited",
  none: "None",
  unknown: "Unknown",
} as const;

export function DataQualityDetails({ trip }: { trip: TripZone }) {
  const dq = trip.dataQuality;
  const { roadAccess: ra, legality: lg, remoteness: rm } = trip;
  const sensitive = sensitiveLocationNote(trip.sensitiveLocationLevel);
  const warnings = getDataQualityWarnings(trip);

  return (
    <div className="space-y-5">
      {/* Confidence by category */}
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-sand-300">
          Data confidence by category
        </h4>
        <p className="mb-3 text-xs text-basecamp-600">
          Managed by {LAND_MANAGER_LABELS[trip.landManager]} · last reviewed{" "}
          {formatReviewedDate(dq.lastReviewedAt)}. Curated planning data, not
          live conditions.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CategoryRow label="Overall" category={dq.overall} />
          <CategoryRow label="Access" category={dq.access} />
          <CategoryRow label="Camping" category={dq.camping} />
          <CategoryRow label="Activities" category={dq.activities} />
          <CategoryRow label="Legality" category={dq.legality} />
          <CategoryRow label="Seasonality" category={dq.seasonality} />
        </div>
      </div>

      {sensitive && (
        <div className="rounded-lg border border-amber-600/40 bg-amber-900/15 px-3 py-2 text-xs leading-snug text-amber-100">
          <span className="font-semibold">Location protection:</span>{" "}
          {sensitive}
        </div>
      )}

      {/* Access / legality / remoteness facts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <h5 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-sand-300">
            Road access
          </h5>
          <Fact label="Difficulty" value={`${ra.accessRoadDifficulty}/5`} />
          <Fact label="Clearance" value={CLEARANCE_LABELS[ra.clearanceNeeded]} />
          <Fact
            label="4WD required"
            value={ra.fourWheelDriveRequired ? "Yes" : "No"}
          />
          <Fact
            label="Trailer-friendly"
            value={ra.trailerFriendly ? "Yes" : "No"}
          />
          <Fact label="Winter risk" value={`${ra.winterAccessRisk}/5`} />
        </div>
        <div>
          <h5 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-sand-300">
            Legality
          </h5>
          <Fact
            label="Dispersed camping"
            value={YES_NO_AREA[lg.dispersedCampingAllowed]}
          />
          <Fact
            label="Fire bans common"
            value={lg.campfireRestrictionsCommon ? "Yes" : "No"}
          />
          <Fact
            label="Permit likely"
            value={lg.permitLikelyRequired ? "Yes" : "No"}
          />
          <Fact label="OHV legal" value={YES_NO_AREA[lg.ohvLegal]} />
          <Fact
            label="Plated vehicle"
            value={YES_NO_AREA[lg.platedVehicleRequired]}
          />
        </div>
        <div>
          <h5 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-sand-300">
            Remoteness
          </h5>
          <Fact
            label="Cell service"
            value={`${rm.cellServiceLikelihood}/5`}
          />
          <Fact label="Nearest town" value={rm.nearestTown} />
          <Fact
            label="Fuel distance"
            value={
              rm.fuelDistanceMilesEstimate == null
                ? "Unknown"
                : `~${rm.fuelDistanceMilesEstimate} mi`
            }
          />
          <Fact label="Water" value={WATER_LABELS[rm.waterAvailability]} />
        </div>
      </div>

      {/* What to verify */}
      {warnings.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-sand-300">
            Verify before you go
          </h4>
          <ul className="space-y-1 text-sm text-sand-200/85">
            {warnings.map((w, i) => (
              <li key={i} className="flex gap-1.5">
                <span aria-hidden className="text-rust-400">
                  ⚑
                </span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verification links */}
      {trip.verificationLinks.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-sand-300">
            Verification links
          </h4>
          <ul className="space-y-1 text-sm">
            {trip.verificationLinks.map((l) => (
              <li key={l.url} className="flex flex-wrap items-baseline gap-1.5">
                <Badge tone="neutral">
                  {VERIFICATION_CATEGORY_LABELS[l.category]}
                </Badge>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-moss-300 underline-offset-2 hover:underline"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
