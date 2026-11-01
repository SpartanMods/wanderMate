// Browser-side loader for the batch conditions route, shared by the results
// and Surprise Me pages. Imports nothing server-only.
import { UPSTREAM_TIMEOUT_MS } from "./config";
import type { ConditionsByZone } from "./types";

/** Server-side upstream calls are capped at UPSTREAM_TIMEOUT_MS; allow a margin for the route itself. */
export const LIVE_DATA_CLIENT_TIMEOUT_MS = UPSTREAM_TIMEOUT_MS + 5_000;

/** `failed` = the batch request itself didn't succeed, so every zone is unknown. */
export type LiveDataResult = { conditions: ConditionsByZone; failed: boolean };

const FAILED: LiveDataResult = { conditions: {}, failed: true };

/**
 * Loads live conditions for `ids` in one request. Never throws: a network
 * error, non-OK status, malformed body, or the client timeout all return
 * `failed: true`. Aborting via `signal` (e.g. on unmount) also resolves as failed.
 */
export async function loadLiveConditions(
  ids: string[],
  signal?: AbortSignal
): Promise<LiveDataResult> {
  if (ids.length === 0) return { conditions: {}, failed: false };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_DATA_CLIENT_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(`/api/conditions?ids=${encodeURIComponent(ids.join(","))}`, {
      signal: controller.signal,
    });
    if (!res.ok) return FAILED;
    const body: unknown = await res.json();
    if (typeof body !== "object" || body === null || !("conditions" in body)) return FAILED;
    const { conditions } = body as { conditions: unknown };
    if (typeof conditions !== "object" || conditions === null) return FAILED;
    return { conditions: conditions as ConditionsByZone, failed: false };
  } catch {
    return FAILED;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
