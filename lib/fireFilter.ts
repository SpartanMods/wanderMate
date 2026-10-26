/*
 * User-controlled fire filter for the results page (#13). Lives in its own
 * `fire` query param, separate from the `p` preferences hash, and hides
 * nothing by default.
 */

import type { FireStatus } from "./conditions/fireStatus";

export const FIRE_FILTER_PARAM = "fire";

export type FireFilterValue = "closure" | "stage2" | "stage2-partial" | "stage1" | "unknown";

export const FIRE_FILTER_OPTIONS: {
  value: FireFilterValue;
  label: string;
  statuses: FireStatus[];
}[] = [
  { value: "closure", label: "Hide closures / Stage 3", statuses: ["Closure", "Stage 3"] },
  { value: "stage2", label: "Hide Stage 2", statuses: ["Stage 2"] },
  { value: "stage2-partial", label: "Hide Stage 2 (partial)", statuses: ["Stage 2 (partial)"] },
  { value: "stage1", label: "Hide Stage 1", statuses: ["Stage 1"] },
  { value: "unknown", label: "Hide unknown fire status", statuses: ["unknown"] },
];

const VALID_VALUES = new Set<string>(FIRE_FILTER_OPTIONS.map((o) => o.value));

/** Parses the `fire` param; unknown values are ignored, missing = hide nothing. */
export function parseFireFilter(raw: string | null | undefined): Set<FireFilterValue> {
  const hidden = new Set<FireFilterValue>();
  if (!raw) return hidden;
  for (const part of raw.split(",")) {
    const value = part.trim();
    if (VALID_VALUES.has(value)) hidden.add(value as FireFilterValue);
  }
  return hidden;
}

/** Serializes in option order so URLs are stable; empty string = no filter. */
export function serializeFireFilter(hidden: Set<FireFilterValue>): string {
  return FIRE_FILTER_OPTIONS.filter((o) => hidden.has(o.value))
    .map((o) => o.value)
    .join(",");
}

export function isHiddenByFireFilter(
  status: FireStatus,
  hidden: Set<FireFilterValue>
): boolean {
  return FIRE_FILTER_OPTIONS.some((o) => hidden.has(o.value) && o.statuses.includes(status));
}
