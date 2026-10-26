// Client-safe fire-status helpers (types only, no upstream fetch code), so
// the results page and cards can import them without bundling the adapters.
import type { FireLevel, LiveConditions } from "./types";

/** One fire state per zone: a restriction level, confirmed none, or unknown. */
export type FireStatus = FireLevel | "none" | "unknown";

/**
 * Unknown covers: no conditions fetched, no coordinates, a failed or timed
 * out source, or text we couldn't interpret. Unknown is never "none".
 */
export function fireStatusOf(conditions: LiveConditions | null | undefined): FireStatus {
  if (!conditions || conditions.unavailableReason) return "unknown";
  const { fire } = conditions;
  if (!fire) return "unknown";
  if (!fire.hasActiveRestriction) return "none";
  return fire.restrictionLevel ?? "unknown";
}

export const FIRE_STATUS_LABEL: Record<FireStatus, string> = {
  Closure: "Closure",
  "Stage 3": "Stage 3",
  "Stage 2": "Stage 2",
  "Stage 2 (partial)": "Stage 2 (partial)",
  "Stage 1": "Stage 1",
  none: "No fire restrictions reported",
  unknown: "Fire status unavailable",
};
