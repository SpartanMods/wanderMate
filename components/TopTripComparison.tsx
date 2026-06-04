/*
 * Top 3 Comparison UI for WanderMate.
 *
 * A compact, mobile-first summary that sits above the full recommendation
 * cards and helps the user actually choose: best overall vs. safer/easier
 * backup vs. more adventurous, with each option's key metrics, strengths,
 * concerns, and main tradeoff.
 *
 * Display only — all comparison logic lives in lib/comparison.ts. This does
 * not re-run matching or duplicate RecommendationCard.
 */

import { Badge } from "./Badge";
import type {
  ComparisonRole,
  TopTripComparison as TopTripComparisonData,
  TripComparisonItem,
} from "@/lib/comparison";
import { cn, formatDriveTime } from "@/lib/utils";

type TopTripComparisonProps = {
  comparison: TopTripComparisonData;
  isWeakMatchMode?: boolean;
};

/** Roles that read as "tamer/safer" get a calm tone; adventurous gets rust. */
function roleTone(role: ComparisonRole): "moss" | "sand" | "rust" | "sky" {
  switch (role) {
    case "best_overall":
      return "moss";
    case "more_adventurous":
      return "rust";
    case "best_hidden_gem":
      return "sky";
    default:
      return "sand";
  }
}

function scoreTone(score: number): "moss" | "sand" | "rust" {
  return score >= 80 ? "moss" : score >= 70 ? "sand" : "rust";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-basecamp-800 bg-basecamp-900/50 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-basecamp-600">
        {label}
      </div>
      <div className="text-xs font-semibold text-sand-100">{value}</div>
    </div>
  );
}

function ComparisonColumn({ item }: { item: TripComparisonItem }) {
  return (
    <article className="flex flex-col rounded-xl border border-basecamp-800 bg-basecamp-900/40 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold text-basecamp-600">
            #{item.rank}
          </span>
          <h3 className="truncate text-base font-extrabold tracking-tight text-sand-50">
            {item.name}
          </h3>
        </div>
        <Badge tone={scoreTone(item.score)} className="flex-none font-bold">
          {item.score}/100
        </Badge>
      </div>

      {/* Role badges */}
      {item.roles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.roles.map((role, i) => (
            <Badge key={role} tone={roleTone(role)} className="font-semibold">
              {item.roleLabels[i]}
            </Badge>
          ))}
        </div>
      )}

      {/* Metrics */}
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <Metric label="Drive" value={formatDriveTime(item.driveHours)} />
        <Metric label="Access" value={item.accessSummary} />
        <Metric label="Crowd" value={item.crowdSummary} />
        <Metric label="Off-grid" value={item.offGridSummary} />
        <Metric label="Risk" value={item.riskSummary} />
        <Metric label="Data" value={item.dataConfidenceSummary} />
      </div>

      {/* Strengths */}
      <div className="mt-3">
        <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-moss-300">
          Strengths
        </h4>
        <ul className="space-y-1 text-xs text-sand-200/85">
          {item.strengths.map((s, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden className="text-moss-400">
                ✓
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Concerns */}
      <div className="mt-3">
        <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-rust-300">
          Concerns
        </h4>
        <ul className="space-y-1 text-xs text-sand-200/85">
          {item.concerns.map((c, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden className="text-rust-400">
                !
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Main tradeoff */}
      <div className="mt-3 rounded-lg border border-sand-300/20 bg-sand-300/5 px-3 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wide text-sand-300">
          Main tradeoff
        </div>
        <p className="mt-0.5 text-xs leading-snug text-sand-100">
          {item.mainTradeoff}
        </p>
      </div>
    </article>
  );
}

export function TopTripComparison({
  comparison,
  isWeakMatchMode = false,
}: TopTripComparisonProps) {
  const { headline, summary, items } = comparison;
  const cols =
    items.length >= 3
      ? "lg:grid-cols-3"
      : items.length === 2
        ? "lg:grid-cols-2"
        : "lg:grid-cols-1";

  return (
    <section className="card p-5 sm:p-6">
      {/* Header */}
      <p className="text-xs font-bold uppercase tracking-wide text-moss-300">
        Top {items.length} comparison
      </p>
      <h2 className="mt-1 text-xl font-extrabold tracking-tight text-sand-50">
        {headline}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-sand-200/85">
        {summary}
      </p>

      {isWeakMatchMode && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-600/40 bg-amber-900/15 px-3 py-2 text-xs leading-snug text-amber-100">
          <span aria-hidden className="mt-px text-amber-400">
            ◆
          </span>
          <span>
            These are closest matches, not strong recommendations. Treat the
            comparison as directional and loosen constraints if none feel right.
          </span>
        </p>
      )}

      {/* Columns */}
      <div className={cn("mt-4 grid grid-cols-1 gap-3", cols)}>
        {items.map((item) => (
          <ComparisonColumn key={item.tripId} item={item} />
        ))}
      </div>
    </section>
  );
}
