"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/Button";
import { FireFilter } from "@/components/FireFilter";
import { PreferenceSummary } from "@/components/PreferenceSummary";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SafetyNotice } from "@/components/SafetyNotice";
import { TopTripComparison } from "@/components/TopTripComparison";
import tripZones from "@/data/tripZones";
import { buildTopTripComparison } from "@/lib/comparison";
import { isKnownOrigin, resolveOrigin } from "@/lib/geo";
import { loadLiveConditions, type LiveDataResult } from "@/lib/conditions/client";
import {
  FIRE_FILTER_PARAM,
  parseFireFilter,
  serializeFireFilter,
  type FireFilterValue,
} from "@/lib/fireFilter";
import { rankWithLiveConditions } from "@/lib/liveRanking";
import {
  diagnoseRestrictiveness,
  getClosestMatches,
  getEligibleZones,
} from "@/lib/matching";
import { loadPreferences } from "@/lib/storage";
import type { TripPreferences } from "@/lib/types";

const MAX_RESULTS = 7;
type LiveDataState = { status: "loading" } | ({ status: "ready" } & LiveDataResult);

export default function ResultsPage() {
  const [prefs, setPrefs] = useState<TripPreferences | null | undefined>(
    undefined
  );
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(
    new Set()
  );
  const [live, setLive] = useState<LiveDataState>({ status: "loading" });
  const [hiddenFire, setHiddenFire] = useState<Set<FireFilterValue>>(new Set());

  /**
   * `shownIds` = zones currently on screen. Selections the fire filter has
   * hidden are dropped so they don't count toward the 3-zone limit.
   */
  function toggleCompare(zoneId: string, shownIds: Set<string>) {
    setSelectedForCompare((prev) => {
      const next = new Set(Array.from(prev).filter((id) => shownIds.has(id)));
      if (next.has(zoneId)) {
        next.delete(zoneId);
        return next;
      }
      if (next.size >= 3) return next;
      next.add(zoneId);
      return next;
    });
  }

  useEffect(() => {
    setPrefs(loadPreferences());
    const params = new URLSearchParams(window.location.search);
    setHiddenFire(parseFireFilter(params.get(FIRE_FILTER_PARAM)));
  }, []);

  function updateFireFilter(next: Set<FireFilterValue>) {
    setHiddenFire(next);
    const url = new URL(window.location.href);
    const value = serializeFireFilter(next);
    if (value) url.searchParams.set(FIRE_FILTER_PARAM, value);
    else url.searchParams.delete(FIRE_FILTER_PARAM);
    window.history.replaceState(null, "", url);
  }

  // Zones that pass the hard constraints; only these need live data.
  const eligibleIds = useMemo(
    () => (prefs ? getEligibleZones(prefs, tripZones).map((z) => z.id) : []),
    [prefs]
  );

  // One batch request for every eligible zone. Each zone and source is
  // fetched independently server-side; we wait for all to settle, then rank once.
  useEffect(() => {
    if (!prefs) return;
    setLive({ status: "loading" });
    const controller = new AbortController();
    let cancelled = false;
    loadLiveConditions(eligibleIds, controller.signal).then((result) => {
      if (!cancelled) setLive({ status: "ready", ...result });
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [prefs, eligibleIds]);

  const ranking = useMemo(
    () =>
      prefs && live.status === "ready"
        ? rankWithLiveConditions(prefs, tripZones, live.conditions, hiddenFire, MAX_RESULTS)
        : null,
    [prefs, live, hiddenFire]
  );

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

  // Every zone that passes the hard limits is ranked; the fire filter may hide
  // some. The closest-match fallback only applies when no zone passes at all.
  const liveConditions = live.status === "ready" ? live.conditions : null;
  const liveFailed = live.status === "ready" && live.failed;
  const hasMatches = ranking ? ranking.rankedCount > 0 : true;
  const list = !ranking
    ? []
    : hasMatches
      ? ranking.visible
      : getClosestMatches(prefs, tripZones, 3);
  const top = list[0];
  const rest = list.slice(1);
  const shownIds = new Set(list.map((r) => r.trip.id));
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
            {!ranking
              ? "Ranking your zones with live conditions…"
              : hasMatches
                ? `${list.length} zone${list.length === 1 ? "" : "s"} ranked, best match first.`
                : "No zones fit your hard limits — showing the closest options with warnings."}
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

      {!ranking && (
        <div
          className="card p-8 text-center text-sand-200/70 animate-pulse"
          role="status"
          aria-live="polite"
        >
          Loading live data… checking fire restrictions and weather for {eligibleIds.length} zones.
        </div>
      )}

      {ranking && hasMatches && liveFailed && (
        <p
          className="rounded-xl border border-amber-600/40 bg-amber-900/15 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          Live conditions couldn&apos;t be loaded right now, so every zone&apos;s fire
          status is unknown and fire restrictions aren&apos;t reflected in the ranking.
          Verify restrictions locally before you go.
        </p>
      )}

      {ranking && hasMatches && (
        <FireFilter hidden={hiddenFire} onChange={updateFireFilter} />
      )}

      {ranking && hasMatches && ranking.hiddenCount > 0 && list.length > 0 && (
        <p className="text-xs text-sand-200/60">
          {ranking.hiddenCount} zone{ranking.hiddenCount === 1 ? "" : "s"} hidden by your fire filter.
        </p>
      )}

      {ranking && hasMatches && list.length === 0 && (
        <div className="rounded-xl border border-amber-600/40 bg-amber-900/15 p-5 text-sm text-amber-100">
          {liveFailed
            ? `Live data didn't load, so all ${ranking.rankedCount} matching zones have unknown fire status and your filter hides them.`
            : `All ${ranking.rankedCount} matching zones are hidden by your fire filter.`}{" "}
          <button
            type="button"
            onClick={() => updateFireFilter(new Set())}
            className="font-semibold text-amber-200 underline-offset-2 hover:underline"
          >
            Show all zones
          </button>
        </div>
      )}

      {/* No-match coaching */}
      {ranking && !hasMatches && (
        <div className="rounded-xl border border-amber-600/40 bg-amber-900/15 p-5">
          <h2 className="text-lg font-bold text-amber-100">
            Your filters are a little tight
          </h2>
          <p className="mt-1 text-sm text-amber-100/80">
            No zone passed your hard limits (like season or vehicle access).
            Here&apos;s what&apos;s likely narrowing your results:
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
            onToggleCompare={() => toggleCompare(top.trip.id, shownIds)}
            compareCount={selectedRecs.length}
            conditions={hasMatches && liveConditions ? liveConditions[top.trip.id] ?? null : undefined}
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
              onToggleCompare={() => toggleCompare(rec.trip.id, shownIds)}
              compareCount={selectedRecs.length}
              conditions={hasMatches && liveConditions ? liveConditions[rec.trip.id] ?? null : undefined}
            />
          ))}
        </div>
      )}

      {/* Compare panel */}
      {selectedRecs.length < 2 ? (
        <div className="rounded-xl border border-basecamp-700/50 bg-basecamp-900/30 p-4 text-sm text-sand-200/60">
          Select 2–3 trips above to compare them side by side.
        </div>
      ) : (
        comparison && (
          <TopTripComparison comparison={comparison} isWeakMatchMode={!hasMatches} />
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
