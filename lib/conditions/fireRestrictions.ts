import { UPSTREAM_TIMEOUT_MS } from "./config";
import { fireCoverageFor, type FireCoverage } from "./fireCoverage";
import {
  FIRE_SOURCES,
  buildQueryUrl,
  interpretResponse,
  worseLevel,
  type FireSource,
  type SourceAnswer,
} from "./fireSources";
import type { FireRestriction, FireSourceId } from "./types";

/** Queries one source; a non-OK status, network error or timeout is unknown. */
async function querySource(
  source: FireSource<unknown>,
  lat: number,
  lng: number,
  timeoutMs: number
): Promise<SourceAnswer> {
  try {
    const res = await fetch(buildQueryUrl(source, lat, lng), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { kind: "unknown" };
    return interpretResponse(source, await res.json());
  } catch {
    return { kind: "unknown" };
  }
}

/**
 * Combines per-source answers (#11 decisions): the worst restriction found
 * always wins; "no restriction" only when coverage is complete and every
 * source confirmed it; anything else is unknown (null).
 */
export function combineAnswers(
  answers: { id: FireSourceId; answer: SourceAnswer }[],
  coverage: Pick<FireCoverage, "complete">,
  fetchedAt: string
): FireRestriction | null {
  let worst: { id: FireSourceId; answer: Extract<SourceAnswer, { kind: "restriction" }> } | null =
    null;
  for (const { id, answer } of answers) {
    if (answer.kind !== "restriction") continue;
    if (!worst || worseLevel(worst.answer.level, answer.level) !== worst.answer.level) {
      worst = { id, answer };
    }
  }
  if (worst) {
    return {
      hasActiveRestriction: true,
      restrictionLevel: worst.answer.level,
      affectedArea: worst.answer.area,
      sources: [worst.id],
      fetchedAt,
    };
  }

  const allClear = answers.length > 0 && answers.every(({ answer }) => answer.kind === "clear");
  if (!coverage.complete || !allClear) return null;
  return {
    hasActiveRestriction: false,
    restrictionLevel: null,
    affectedArea: null,
    sources: answers.map(({ id }) => id),
    fetchedAt,
  };
}

/**
 * Returns the most severe active fire restriction within the search radius of
 * a zone, from the sources that cover it (see fireCoverage.ts). Returns null
 * (unknown) when nothing is in force but coverage is incomplete or any source
 * failed. Sources are queried concurrently, each with its own timeout.
 */
export async function fetchFireRestrictions(
  zoneId: string,
  lat: number,
  lng: number,
  timeoutMs: number = UPSTREAM_TIMEOUT_MS
): Promise<FireRestriction | null> {
  const coverage = fireCoverageFor(zoneId);
  if (coverage.sources.length === 0) return null;

  const answers = await Promise.all(
    coverage.sources.map(async (id) => ({
      id,
      answer: await querySource(FIRE_SOURCES[id], lat, lng, timeoutMs),
    }))
  );
  return combineAnswers(answers, coverage, new Date().toISOString());
}
