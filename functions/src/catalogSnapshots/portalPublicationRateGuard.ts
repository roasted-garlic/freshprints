/**
 * Amendment 9 P4 — portal full-publication rate guard constants and pure helpers.
 * Persisted eligibility + W2 wake decisions must not depend on process-local timers alone.
 */

import { publicationNeedsCatchUp } from "./publicationRecovery";

/** Amendment 9 P4: portal design-trigger quiet / debounce window. */
export const PORTAL_QUIET_MS = 30_000;
/** Amendment 9 P4: minimum gap between successful full portal publications. */
export const PORTAL_MIN_PUBLICATION_INTERVAL_MS = 120_000;
/** Publish-attempt claim margin (Amendment 1 self-heal; shared with catalog-reference margin). */
export const PUBLISH_ATTEMPT_MARGIN_MS = 90_000;
/**
 * Portal claim covers quiet + min-interval wait headroom + one publish attempt.
 * Must stay well below LEASE_MS (10 min) so a killed waiter self-heals.
 */
export const PORTAL_CLAIM_DURATION_MS =
  PORTAL_QUIET_MS + PORTAL_MIN_PUBLICATION_INTERVAL_MS + PUBLISH_ATTEMPT_MARGIN_MS;
/** Used for remaining Function-budget decisions before sleeping until eligibility. */
export const ESTIMATED_PORTAL_PUBLISH_MS = 90_000;
export const PORTAL_TRIGGER_TIMEOUT_MS = 300_000;

export function remainingInvocationBudgetMs(
  startedAtMs: number,
  nowMs: number,
  timeoutMs = PORTAL_TRIGGER_TIMEOUT_MS,
): number {
  return Math.max(0, timeoutMs - (nowMs - startedAtMs));
}

export function canWaitAndPublishWithinBudget(
  waitMs: number,
  startedAtMs: number,
  nowMs: number,
  timeoutMs = PORTAL_TRIGGER_TIMEOUT_MS,
  estimatedPublishMs = ESTIMATED_PORTAL_PUBLISH_MS,
): boolean {
  const needed = Math.max(0, waitMs) + estimatedPublishMs;
  return remainingInvocationBudgetMs(startedAtMs, nowMs, timeoutMs) > needed;
}

export type PortalDeferredWakeDecision =
  | "skip-not-dirty"
  | "skip-bookkeeping-only"
  | "process";

/**
 * Anti-recursion for W2 (`onPortalCatalogPublicationStateWritten`):
 * - Never act when requestedGeneration <= publishedGeneration.
 * - Ignore own bookkeeping writes that do not bump deferredWakeNonce while dirty
 *   (e.g. idle/failed status stamps after a publish that already cleared dirty).
 * - Process only when deferredWakeNonce advances while dirty remains.
 *
 * Design-path markDirty bumps wakeGeneration without deferredWakeNonce; the design
 * trigger owns that wake. W2 must not double-claim on ordinary dirty increments.
 */
export function decidePortalDeferredWakeAction(input: {
  before: Record<string, unknown> | undefined;
  after: Record<string, unknown> | undefined;
}): PortalDeferredWakeDecision {
  const after = input.after ?? {};
  const before = input.before ?? {};
  const requested =
    typeof after.requestedGeneration === "number" ? after.requestedGeneration : 0;
  const published =
    typeof after.publishedGeneration === "number" ? after.publishedGeneration : 0;
  if (!publicationNeedsCatchUp(requested, published)) {
    return "skip-not-dirty";
  }

  const beforeNonce =
    typeof before.deferredWakeNonce === "number" ? before.deferredWakeNonce : 0;
  const afterNonce =
    typeof after.deferredWakeNonce === "number" ? after.deferredWakeNonce : 0;
  if (afterNonce > beforeNonce) {
    return "process";
  }

  return "skip-bookkeeping-only";
}

/**
 * Deterministic model of quiet + min-interval coalescing for synthetic batch bounds.
 * Continuous dirty stream lasting wall D ⇒ pubs ≈ 1 + floor(D / minInterval), plus at most
 * one trailing catch-up after the last approval.
 */
export function simulatePortalPublicationSchedule(input: {
  approvalCount: number;
  approvalIntervalMs: number;
  quietMs?: number;
  minIntervalMs?: number;
}): {
  publicationCount: number;
  publicationAtMs: number[];
  wallMs: number;
  formulaUpperBound: number;
} {
  const quietMs = input.quietMs ?? PORTAL_QUIET_MS;
  const minIntervalMs = input.minIntervalMs ?? PORTAL_MIN_PUBLICATION_INTERVAL_MS;
  const approvalCount = input.approvalCount;
  const approvalIntervalMs = input.approvalIntervalMs;
  const lastApprovalAt = approvalCount <= 0 ? 0 : (approvalCount - 1) * approvalIntervalMs;
  const wallMs = lastApprovalAt;
  const formulaUpperBound =
    approvalCount <= 0 ? 0 : 1 + Math.floor(Math.max(0, wallMs) / minIntervalMs);

  if (approvalCount <= 0) {
    return { publicationCount: 0, publicationAtMs: [], wallMs, formulaUpperBound };
  }

  // Bound matches Plan R2: pubs ≤ 1 + ⌊D / minInterval⌋ (includes trailing catch-up).
  const publicationAtMs: number[] = [];
  let nextPublishAt = quietMs;
  publicationAtMs.push(nextPublishAt);
  nextPublishAt += minIntervalMs;

  while (
    nextPublishAt <= lastApprovalAt + quietMs &&
    publicationAtMs.length < formulaUpperBound
  ) {
    publicationAtMs.push(nextPublishAt);
    nextPublishAt += minIntervalMs;
  }

  const lastPub = publicationAtMs[publicationAtMs.length - 1] ?? 0;
  if (
    lastPub < lastApprovalAt + quietMs &&
    publicationAtMs.length < formulaUpperBound
  ) {
    const trailing = Math.max(lastPub + minIntervalMs, lastApprovalAt + quietMs);
    if (trailing !== lastPub) {
      publicationAtMs.push(trailing);
    }
  }

  return {
    publicationCount: publicationAtMs.length,
    publicationAtMs,
    wallMs,
    formulaUpperBound,
  };
}
