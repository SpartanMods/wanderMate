import { UPSTREAM_TIMEOUT_MS } from "./config";
import { fireCoverageFor, type FireCoverage } from "./fireCoverage";
import {
  FIRE_SOURCES,
  buildQueryUrl,
  interpretResponse,
  unknownAnswer,
  worseLevel,
  type FireSource,
  type SourceAnswer,
} from "./fireSources";
import type { FireRestriction, FireSourceId } from "./types";

/** Same 1h data-cache window as the other upstream adapters. */
const FIRE_FETCH_REVALIDATE_SECONDS = 3600;

/**
 * ArcGIS reports errors as HTTP 200, so Next's data cache stores an error body
 * like any other response. A failed answer is retried once under a cache key
 * that changes every RETRY_CACHE_BUCKET_MS, so a cached error clears within
 * that window instead of lasting the full revalidate period.
 */
const RETRY_CACHE_BUCKET_MS = 5 * 60 * 1000;

function retryCacheKey(now: number = Date.now()): string {
  return `retry-${Math.floor(now / RETRY_CACHE_BUCKET_MS)}`;
}

async function fetchAnswer(
  source: FireSource<unknown>,
  url: string,
  signal: AbortSignal
): Promise<SourceAnswer> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: FIRE_FETCH_REVALIDATE_SECONDS },
      signal,
    });
    if (!res.ok) return unknownAnswer("failed");
    return interpretResponse(source, await res.json());
  } catch {
    return unknownAnswer("failed");
  }
}

/**
 * Queries one source, retrying a failed lookup once (see RETRY_CACHE_BUCKET_MS).
 * Both attempts share one timeout, so a source never takes longer than
 * `timeoutMs`. A failure after the retry, or the timeout, is unknown.
 */
async function querySource(
  source: FireSource<unknown>,
  lat: number,
  lng: number,
  timeoutMs: number
): Promise<SourceAnswer> {
  const signal = AbortSignal.timeout(timeoutMs);
  const first = await fetchAnswer(source, buildQueryUrl(source, lat, lng), signal);
  if (first.kind !== "unknown" || first.reason !== "failed" || signal.aborted) return first;
  return fetchAnswer(source, buildQueryUrl(source, lat, lng, retryCacheKey()), signal);
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

export type FireLookup = {
  /** Null = unknown (see combineAnswers). */
  fire: FireRestriction | null;
  /**
   * True when a source lookup failed (network, HTTP, ArcGIS error, schema
   * mismatch, truncation). False when an unknown result is a stable coverage
   * gap, so callers can cache it normally.
   */
  failed: boolean;
};

/**
 * Looks up fire restrictions within the search radius of a zone, from the
 * sources that cover it (see fireCoverage.ts). Sources are queried
 * concurrently, each within `timeoutMs`.
 */
export async function fetchFireRestrictions(
  zoneId: string,
  lat: number,
  lng: number,
  timeoutMs: number = UPSTREAM_TIMEOUT_MS
): Promise<FireLookup> {
  const coverage = fireCoverageFor(zoneId);
  if (coverage.sources.length === 0) return { fire: null, failed: false };

  const answers = await Promise.all(
    coverage.sources.map(async (id) => ({
      id,
      answer: await querySource(FIRE_SOURCES[id], lat, lng, timeoutMs),
    }))
  );
  return {
    fire: combineAnswers(answers, coverage, new Date().toISOString()),
    failed: answers.some(({ answer }) => answer.kind === "unknown" && answer.reason === "failed"),
  };
}
