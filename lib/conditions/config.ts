/**
 * Max time any single upstream request may take before it is abandoned and
 * treated as unknown (#13). weather.gov's two chained calls share one budget.
 */
export const UPSTREAM_TIMEOUT_MS = 10_000;
