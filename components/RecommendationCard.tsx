"use client";

import { useState } from "react";
import { Badge } from "./Badge";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { SafetyNotice } from "./SafetyNotice";
import {
  ACTIVITY_LABELS,
  CAMPING_LABELS,
  VEHICLE_LABELS,
} from "@/lib/constants";
import type { ActivityKey, TripRecommendation } from "@/lib/types";
import { cn, formatDriveTime, titleCase } from "@/lib/utils";

function ScoreRing({ score }: { score: number }) {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 80 ? "#85a24f" : score >= 70 ? "#c09e57" : score >= 60 ? "#cd7442" : "#a64626";
  return (
    <div className="relative h-16 w-16 flex-none">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#241e14"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black leading-none text-sand-50">
          {score}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-basecamp-600">
          match
        </span>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-basecamp-800 bg-basecamp-900/50 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-basecamp-600">
        {label}
      </div>
      <div className="text-sm font-semibold text-sand-100">{value}</div>
    </div>
  );
}

function topActivities(trip: TripRecommendation["trip"]): string[] {
  return (Object.entries(trip.activities) as [ActivityKey, number][])
    .filter(([, v]) => v >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => ACTIVITY_LABELS[k]);
}

const confidenceTone = {
  high: "moss",
  medium: "sand",
  low: "rust",
} as const;

export function RecommendationCard({
  rec,
  rank,
  featured = false,
  originLabel = "Denver, CO",
}: {
  rec: TripRecommendation;
  rank: number;
  featured?: boolean;
  originLabel?: string;
}) {
  const [open, setOpen] = useState(featured);
  const originShort = originLabel.split(",")[0];
  const { trip, score, qualityLabel, breakdown, whyItMatches, whyItMightNot } =
    rec;
  const bestFor = topActivities(trip);

  return (
    <article
      className={cn(
        "card overflow-hidden",
        featured && "border-moss-500/50 ring-1 ring-moss-500/20"
      )}
    >
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <ScoreRing score={score} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {featured && (
                <Badge tone="moss" className="font-bold">
                  ★ Top pick
                </Badge>
              )}
              {!featured && (
                <span className="text-xs font-semibold text-basecamp-600">
                  #{rank}
                </span>
              )}
              <Badge
                tone={
                  score >= 80 ? "moss" : score >= 70 ? "sand" : "rust"
                }
              >
                {qualityLabel}
              </Badge>
            </div>
            <h3 className="mt-1.5 text-xl font-extrabold tracking-tight text-sand-50">
              {trip.name}
            </h3>
            <p className="text-sm text-sand-200/70">
              {trip.region} · {trip.state} · {trip.generalArea}
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-sand-200/85">
          {trip.summary}
        </p>

        {/* Best-for tags */}
        {bestFor.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {bestFor.map((a) => (
              <Badge key={a} tone="moss">
                {a}
              </Badge>
            ))}
          </div>
        )}

        {/* Stat grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile
            label={`Drive (${originShort})`}
            value={formatDriveTime(rec.effectiveDriveHours)}
          />
          <StatTile label="Skill" value={titleCase(trip.skillLevel)} />
          <StatTile label="Off-grid" value={`${trip.offGridLevel}/4`} />
          <StatTile label="Crowd" value={`${trip.crowdLevel}/5`} />
          <StatTile label="Hidden gem" value={`${trip.hiddenGemScore}/5`} />
          <StatTile
            label="Vehicle"
            value={VEHICLE_LABELS[trip.vehicleRequirement]}
          />
        </div>

        {/* Camping + confidence row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {trip.campingTypes.map((c) => (
            <Badge key={c} tone="neutral">
              {CAMPING_LABELS[c]}
            </Badge>
          ))}
          <Badge tone={confidenceTone[trip.dataConfidence]}>
            Data: {trip.dataConfidence}
          </Badge>
        </div>

        {/* Why it matches / might not */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-moss-600/30 bg-moss-900/15 p-3">
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-moss-300">
              Why it matches
            </h4>
            <ul className="space-y-1 text-sm text-sand-200/85">
              {whyItMatches.map((w, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-moss-400" aria-hidden>
                    ✓
                  </span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-rust-600/30 bg-rust-900/15 p-3">
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-rust-300">
              Why it might not
            </h4>
            {whyItMightNot.length > 0 ? (
              <ul className="space-y-1 text-sm text-sand-200/85">
                {whyItMightNot.map((w, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-rust-400" aria-hidden>
                      !
                    </span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-sand-200/60">
                No notable drawbacks for your inputs.
              </p>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-moss-300 hover:text-moss-200"
          aria-expanded={open}
        >
          {open ? "Hide details" : "Itinerary, watchouts & score breakdown"}
          <span aria-hidden className={cn("transition", open && "rotate-180")}>
            ▾
          </span>
        </button>
      </div>

      {/* Details */}
      {open && (
        <div className="border-t border-basecamp-800 bg-basecamp-900/40 p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <DetailList
                title="Suggested itinerary"
                items={trip.suggestedItinerary}
                ordered
              />
              <DetailList
                title="Watchouts"
                items={trip.watchouts}
                tone="rust"
              />
              <DetailList
                title="Safety notes"
                items={trip.safetyNotes}
                tone="amber"
              />
              <DetailList title="Backup options" items={trip.backupOptions} />
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-sand-300">
                  Score breakdown
                </h4>
                <ScoreBreakdown breakdown={breakdown} />
              </div>
              {trip.sourceLinks.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-sand-300">
                    Sources
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {trip.sourceLinks.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-moss-300 underline-offset-2 hover:underline"
                        >
                          {s.label}
                        </a>{" "}
                        <span className="text-basecamp-600">({s.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <SafetyNotice compact className="mt-5" />
        </div>
      )}
    </article>
  );
}

function DetailList({
  title,
  items,
  ordered = false,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  ordered?: boolean;
  tone?: "neutral" | "rust" | "amber";
}) {
  if (items.length === 0) return null;
  const marker =
    tone === "rust" ? "text-rust-400" : tone === "amber" ? "text-amber-400" : "text-moss-400";
  const ListTag = ordered ? "ol" : "ul";
  return (
    <div>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-sand-300">
        {title}
      </h4>
      <ListTag className="space-y-1.5 text-sm text-sand-200/85">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className={cn("flex-none font-semibold", marker)} aria-hidden>
              {ordered ? `${i + 1}.` : "•"}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ListTag>
    </div>
  );
}
