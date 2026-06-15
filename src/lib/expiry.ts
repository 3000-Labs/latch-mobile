/**
 * expiry.ts — shared formatting for cosign-packet expiry. Packets pin a short
 * on-chain validity (~8min, see PACKET_TTL_MS in use-pending-packets), so the
 * UI shows a live "expires in …" countdown rather than an absolute time the
 * user has to mentally diff against the clock.
 *
 * All helpers take `now` so a single ticking source (useNow) drives every row
 * in lockstep without each computing its own Date.now().
 */

/** "in 45s" / "in 6m" / "in 2h" / "in 3d" / "expired". Seconds granularity under a minute for urgency. */
export function formatTimeRemaining(iso: string, now: number = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  if (diffMs <= 0) return 'expired';
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `in ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${Math.floor(hrs / 24)}d`;
}

/** True within `thresholdMs` of expiry (default 60s) — used to flag rows as urgent. */
export function isExpiringSoon(
  iso: string,
  now: number = Date.now(),
  thresholdMs = 60_000,
): boolean {
  const diffMs = new Date(iso).getTime() - now;
  return diffMs > 0 && diffMs <= thresholdMs;
}

export function isExpired(iso: string, now: number = Date.now()): boolean {
  return new Date(iso).getTime() - now <= 0;
}
