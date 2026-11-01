/*
 * Results-page ranking with live conditions (#13): score every eligible zone
 * with its fire penalty, apply the user's fire filter, then diversify and rank once.
 */

import { fireStatusOf } from "./conditions/fireStatus";
import type { ConditionsByZone } from "./conditions/types";
import { isHiddenByFireFilter, type FireFilterValue } from "./fireFilter";
import { diversifyRecommendations, scoreEligible, type FireStatusByZone } from "./matching";
import type { TripPreferences, TripRecommendation, TripZone } from "./types";

export type LiveRanking = {
  /** Ranked, filtered, and capped to `limit` — what the page shows. */
  visible: TripRecommendation[];
  /** Zones that passed the hard constraints, before the fire filter. */
  rankedCount: number;
  /** Ranked zones removed by the fire filter. */
  hiddenCount: number;
};

export function rankWithLiveConditions(
  prefs: TripPreferences,
  zones: TripZone[],
  conditions: ConditionsByZone,
  hidden: Set<FireFilterValue>,
  limit: number
): LiveRanking {
  const fireByZone: FireStatusByZone = Object.fromEntries(
    zones.map((z) => [z.id, fireStatusOf(conditions[z.id])])
  );
  const ranked = scoreEligible(prefs, zones, fireByZone);
  // Diversify only what the user will see, so hidden zones don't push down
  // visible zones from the same region.
  const shown = diversifyRecommendations(
    ranked.filter((r) => !isHiddenByFireFilter(fireByZone[r.trip.id], hidden))
  );
  return {
    visible: shown.slice(0, limit),
    rankedCount: ranked.length,
    hiddenCount: ranked.length - shown.length,
  };
}
