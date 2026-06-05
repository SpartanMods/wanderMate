"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/Button";
import { PreferenceSummary } from "@/components/PreferenceSummary";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SafetyNotice } from "@/components/SafetyNotice";
import { TopTripComparison } from "@/components/TopTripComparison";
import tripZones from "@/data/tripZones";
import { buildTopTripComparison } from "@/lib/comparison";
import { isKnownOrigin, resolveOrigin } from "@/lib/geo";
import {
  diagnoseRestrictiveness,
  getClosestMatches,
  getRecommendations,
} from "@/lib/matching";
import { loadPreferences } from "@/lib/storage";
import type { LiveConditions } from "@/lib/conditions";
import type { TripPreferences, TripRecommendation } from "@/lib/types";

const STRONG_THRESHOLD = 68;
const MAX_RESULTS = 7;

export default function ResultsPage() {
  const [prefs, setPrefs] = useState<TripPreferences | null | undefined>(
    undefined
  );
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(
    new Set()
  );
  const [conditions, setConditions] = useState<
    Record<string, LiveConditions>
  >({});
  const [conditionsLoading, setConditionsLoading] = useState(false);

  function toggleCompare(zoneId: string) {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
        return next;
      }
      if (next.size >= 3) return prev;
      next.add(zoneId);
      return next;
    });
  }

  useEffect(() => {
    setPrefs(loadPreferences());
  }, []);

  const data = useMemo(() => {
    if (!prefs) return null;
    const recs = getRecommendations(prefs, tripZones).slice(0, MAX_RESULTS);
    const strong = recs.filter((r) => r.score >= STRONG_THRESHOLD);
    return { recs, strong };
  }, [prefs]);

  // Fetch live conditions for all visible result zones in parallel
  useEffect(() => {
    if (!data) return;
    const list = data.strong.length > 0 ? data.recs : [];
    if (list.length === 0) return;
    setConditionsLoading(true);
    Promise.all(
      list.map((r) =>
        fetch(`/api/conditions/${r.trip.id}`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
          .then((cond) => [r.trip.id, cond] as const)
      )
    ).then((results) => {
      const map: Record<string, LiveConditions> = {};
      for (const [id, cond] of results) {
        if (cond) map[id] = cond as LiveConditions;
      }
      setConditions(map);
      setConditionsLoading(false);
    });
  }, [data]);

  // Loading / no-preferences states.
  if (prefs === undefined) {
    return (
      <div className="py-20 text-center text-sand-200/60">Loading your matches…</div>
    );
  }

  if (prefs === null) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-sand-50">No trip yet</h1>
        <p className="mt-2 text-sand-200/80">
          We couldn&apos;t find saved preferences. Plan a trip to get ranked
          recommendations.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/planner">Plan a Trip</ButtonLink>
          <ButtonLink href="/surprise" variant="ghost">
            Surprise Me
          </ButtonLink>
        </div>
      </div>
    );
  }

  const { recs, strong } = data!;
  const hasStrong = strong.length > 0;
  const list = hasStrong ? recs : getClosestMatches(prefs, tripZones, 3);
  const top = list[0];
  const rest = list.slice(1);
  const selectedRecs = list.filter((r) => selectedForCompare.has(r.trip.id));
  const comparison =
    selectedRecs.length >= 2
      ? buildTopTripComparison(prefs, selectedRecs, selectedRecs.length)
      : null;
  const originLabel = resolveOrigin(prefs.startingLocation).label;
  const originRecognized = isKnownOrigin(prefs.startingLocation);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-sand-50">
            Your ranked trips
          </h1>
          <p className="mt-1 text-sand-200/75">
            {hasStrong
              ? `${strong.length} strong match${strong.length === 1 ? "" : "es"} out of ${recs.length} zones scored.`
              : "No strong matches — showing the closest options with warnings."}
          </p>
          <p className="mt-1 text-xs text-basecamp-600">
            {originRecognized
              ? `Drive times estimated from ${originLabel}.`
              : `We didn't recognize “${prefs.startingLocation}” — drive times fall back to Denver, CO.`}
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/planner" variant="ghost" size="sm">
            Adjust preferences
          </ButtonLink>
          <ButtonLink href="/surprise" variant="secondary" size="sm">
            Surprise me instead
          </ButtonLink>
        </div>
      </div>

      <PreferenceSummary prefs={prefs} />

      <SafetyNotice />

      {/* Empty / weak-match coaching */}
      {!hasStrong && (
        <div className="rounded-xl border border-amber-600/40 bg-amber-900/15 p-5">
          <h2 className="text-lg font-bold text-amber-100">
            Your filters are a little tight
          </h2>
          <p className="mt-1 text-sm text-amber-100/80">
            Nothing cleared a {STRONG_THRESHOLD}+ match. Here&apos;s what&apos;s
            likely narrowing your results:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-amber-50/90">
            {diagnoseRestrictiveness(prefs, tripZones).map((r, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-amber-400">
                  →
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link
              href="/planner"
              className="text-sm font-semibold text-amber-200 underline-offset-2 hover:underline"
            >
              Loosen your preferences →
            </Link>
          </div>
        </div>
      )}

      {/* Why these were selected */}
      <div className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-sand-300">
          Why these were selected
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-sand-200/85">
          We scored all {tripZones.length} zones across CO, WY &amp; UT against your
          weighted activities, skill, vehicle, off-grid appetite, crowd
          tolerance, and must-avoids. Hidden-gem logic boosted quieter,
          under-the-radar zones{prefs.crowdTolerance >= 3 ? " (you asked for quiet)" : ""}, and
          we diversified the top of the list by region so you&apos;re not staring
          at five versions of the same place.
        </p>
      </div>

      {/* Top pick */}
      {top && (
        <div>
          <RecommendationCard
            rec={top}
            rank={1}
            featured
            originLabel={originLabel}
            isSelectedForCompare={selectedForCompare.has(top.trip.id)}
            onToggleCompare={() => toggleCompare(top.trip.id)}
            compareCount={selectedForCompare.size}
            conditions={conditions[top.trip.id] ?? null}
            conditionsLoading={conditionsLoading}
          />
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-sand-50">More options</h2>
          {rest.map((rec, i) => (
            <RecommendationCard
              key={rec.trip.id}
              rec={rec}
              rank={i + 2}
              originLabel={originLabel}
              isSelectedForCompare={selectedForCompare.has(rec.trip.id)}
              onToggleCompare={() => toggleCompare(rec.trip.id)}
              compareCount={selectedForCompare.size}
              conditions={conditions[rec.trip.id] ?? null}
              conditionsLoading={conditionsLoading}
            />
          ))}
        </div>
      )}

      {/* Compare panel */}
      {selectedForCompare.size < 2 ? (
        <div className="rounded-xl border border-basecamp-700/50 bg-basecamp-900/30 p-4 text-sm text-sand-200/60">
          Select 2–3 trips above to compare them side by side.
        </div>
      ) : (
        comparison && (
          <TopTripComparison comparison={comparison} isWeakMatchMode={!hasStrong} />
        )
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <ButtonLink href="/planner" variant="ghost">
          ← Adjust preferences
        </ButtonLink>
        <ButtonLink href="/surprise" variant="secondary">
          🎲 Surprise me instead
        </ButtonLink>
      </div>
    </div>
  );
}
