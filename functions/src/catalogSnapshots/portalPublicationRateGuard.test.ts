import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canWaitAndPublishWithinBudget,
  decidePortalDeferredWakeAction,
  PORTAL_CLAIM_DURATION_MS,
  PORTAL_MIN_PUBLICATION_INTERVAL_MS,
  PORTAL_QUIET_MS,
  simulatePortalPublicationSchedule,
} from "./portalPublicationRateGuard";
import { isPortalPublicationEligible } from "./publicationRecovery";

describe("portal publication rate guard (Amendment 9 P4)", () => {
  it("uses approved quiet, min-interval, and claim duration constants", () => {
    assert.equal(PORTAL_QUIET_MS, 30_000);
    assert.equal(PORTAL_MIN_PUBLICATION_INTERVAL_MS, 120_000);
    assert.equal(PORTAL_CLAIM_DURATION_MS, 240_000);
  });

  it("treats missing nextEligiblePublishAt as immediately eligible", () => {
    assert.equal(isPortalPublicationEligible({}, Date.now()), true);
    assert.equal(isPortalPublicationEligible({ nextEligiblePublishAt: null }, Date.now()), true);
  });

  it("honors persisted nextEligiblePublishAt from another instance", () => {
    const now = 1_000_000;
    const eligibleAt = now + 60_000;
    assert.equal(
      isPortalPublicationEligible({
        nextEligiblePublishAt: { toMillis: () => eligibleAt },
      }, now),
      false,
    );
    assert.equal(
      isPortalPublicationEligible({
        nextEligiblePublishAt: { toMillis: () => eligibleAt },
      }, eligibleAt),
      true,
    );
  });

  it("W2 anti-recursion: skips when not dirty or when bookkeeping-only", () => {
    assert.equal(
      decidePortalDeferredWakeAction({
        before: { requestedGeneration: 5, publishedGeneration: 5 },
        after: { requestedGeneration: 5, publishedGeneration: 5, status: "idle" },
      }),
      "skip-not-dirty",
    );
    assert.equal(
      decidePortalDeferredWakeAction({
        before: { requestedGeneration: 9, publishedGeneration: 8, deferredWakeNonce: 1 },
        after: { requestedGeneration: 9, publishedGeneration: 8, deferredWakeNonce: 1, status: "idle" },
      }),
      "skip-bookkeeping-only",
    );
  });

  it("W2 processes only when deferredWakeNonce advances while dirty", () => {
    assert.equal(
      decidePortalDeferredWakeAction({
        before: { requestedGeneration: 9, publishedGeneration: 8, deferredWakeNonce: 1 },
        after: { requestedGeneration: 9, publishedGeneration: 8, deferredWakeNonce: 2 },
      }),
      "process",
    );
  });

  it("does not publish when remaining budget cannot cover wait + publish", () => {
    const started = 0;
    const now = 250_000;
    assert.equal(
      canWaitAndPublishWithinBudget(120_000, started, now, 300_000, 90_000),
      false,
    );
    assert.equal(
      canWaitAndPublishWithinBudget(10_000, started, 0, 300_000, 90_000),
      true,
    );
  });

  it("45 paced approvals at ~13s stay under Plan 10-min formula bound and far below 25", () => {
    const result = simulatePortalPublicationSchedule({
      approvalCount: 45,
      approvalIntervalMs: 13_000,
    });
    // Plan: 1+⌊D/120⌋ for D≤600s is 6; continuous dirty + one trailing W2 ≤ that bound.
    assert.ok(result.wallMs <= 10 * 60_000, `wall ${result.wallMs}`);
    assert.ok(
      result.publicationCount <= 6,
      `expected ≤6 pubs (10-min formula bound), got ${result.publicationCount} at ${result.publicationAtMs.join(",")}`,
    );
    assert.ok(result.publicationCount < 25, "must not reproduce observed 25 pubs");
    for (let i = 1; i < result.publicationAtMs.length; i += 1) {
      const gap = result.publicationAtMs[i]! - result.publicationAtMs[i - 1]!;
      assert.ok(gap >= PORTAL_MIN_PUBLICATION_INTERVAL_MS, `gap ${gap}`);
    }
  });

  it("45 approvals at ~10s meet the Plan ≤5 target under a shorter wall", () => {
    const result = simulatePortalPublicationSchedule({
      approvalCount: 45,
      approvalIntervalMs: 10_000,
    });
    assert.ok(result.wallMs <= 8 * 60_000);
    assert.ok(
      result.publicationCount <= 5,
      `expected ≤5 pubs, got ${result.publicationCount}`,
    );
  });

  it("100 paced approvals at ~8.4s stay within ≤8 publications", () => {
    const result = simulatePortalPublicationSchedule({
      approvalCount: 100,
      approvalIntervalMs: 8_400,
    });
    assert.ok(result.wallMs <= 14 * 60_000, `wall ${result.wallMs}`);
    assert.ok(
      result.publicationCount <= 8,
      `expected ≤8 pubs, got ${result.publicationCount}`,
    );
    for (let i = 1; i < result.publicationAtMs.length; i += 1) {
      const gap = result.publicationAtMs[i]! - result.publicationAtMs[i - 1]!;
      assert.ok(gap >= PORTAL_MIN_PUBLICATION_INTERVAL_MS, `gap ${gap}`);
    }
  });

  it("import-style zero approvals produce zero publications", () => {
    assert.equal(
      simulatePortalPublicationSchedule({ approvalCount: 0, approvalIntervalMs: 1000 })
        .publicationCount,
      0,
    );
  });
});
