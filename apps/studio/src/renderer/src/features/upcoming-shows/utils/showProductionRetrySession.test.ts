import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  deriveShowReconciliationRetryPresentation,
  ShowProductionRetrySession,
} from "./showProductionRetrySession";

function mountedSession(): ShowProductionRetrySession {
  const session = new ShowProductionRetrySession();
  session.setShowId("show-1");
  return session;
}

describe("ShowProductionRetrySession phase authority", () => {
  it("survives the Strict Mode setup-cleanup-setup probe", () => {
    const session = mountedSession();
    session.markMounted();
    session.markUnmounted();
    session.markMounted();
    const timer = session.beginTimerAction("show-1");
    assert.equal(timer.reason, "acquired");
    assert.equal(timer.ok, true);
  });

  it("true final unmount invalidates a token and rejects future acquisition as unmounted", () => {
    const session = mountedSession();
    const timer = session.beginTimerAction("show-1");
    session.markUnmounted();
    assert.equal(session.isStillAuthoritative("show-1", timer.token!), false);
    assert.deepEqual(session.acquireRetry("show-1"), { ok: false, reason: "unmounted" });
  });

  it("distinguishes show_mismatch and phase_busy rejection reasons", () => {
    const session = mountedSession();
    assert.equal(session.beginTimerAction("show-2").reason, "show_mismatch");
    const timer = session.beginTimerAction("show-1");
    assert.equal(timer.ok, true);
    assert.equal(session.acquireRetry("show-1").reason, "phase_busy");
  });

  it("Finish releases atomically to Retry availability only with verified retryable scope", () => {
    const session = mountedSession();
    const timer = session.beginTimerAction("show-1");
    assert.equal(session.canStartRetry("show-1"), false);
    assert.equal(session.complete(timer.token!, true), true);
    assert.equal(session.snapshot().phase, "retry_available");
    assert.equal(session.canStartRetry("show-1"), true);
  });

  it("a stale Finish token cannot enable Retry", () => {
    const session = mountedSession();
    const timer = session.beginTimerAction("show-1");
    session.setShowId("show-2");
    assert.equal(session.complete(timer.token!, true), false);
    assert.equal(session.canStartRetry("show-2"), false);
  });

  it("owner runtime case acquires after verified Finish release", () => {
    const session = mountedSession();
    const timer = session.beginTimerAction("show-1");
    session.complete(timer.token!, true);
    const retry = session.acquireRetry("show-1");
    assert.equal(retry.reason, "acquired");
    assert.equal(retry.ok, true);
    const presentation = deriveShowReconciliationRetryPresentation({
      hasWarning: true,
      retryableCount: 1,
      remediationCount: 0,
      phase: session.snapshot().phase,
      canStartRetry: session.canStartRetry("show-1"),
    });
    assert.deepEqual(presentation, {
      state: "retryable",
      buttonDisabled: true,
      buttonLabel: "Retrying…",
    });
  });

  it("production presentation distinguishes Finalizing from active Retrying", () => {
    assert.equal(
      deriveShowReconciliationRetryPresentation({
        hasWarning: true,
        retryableCount: 1,
        remediationCount: 0,
        phase: "timer_action",
        canStartRetry: false,
      }).state,
      "finalizing",
    );
    assert.equal(
      deriveShowReconciliationRetryPresentation({
        hasWarning: true,
        retryableCount: 1,
        remediationCount: 0,
        phase: "explicit_retry",
        canStartRetry: false,
      }).buttonLabel,
      "Retrying…",
    );
  });

  it("same-frame duplicate Retry activation permits exactly one acquisition", () => {
    const session = mountedSession();
    const timer = session.beginTimerAction("show-1");
    session.complete(timer.token!, true);
    assert.equal(session.acquireRetry("show-1").ok, true);
    assert.equal(session.acquireRetry("show-1").reason, "phase_busy");
  });

  it("rejected Retry release can atomically restore availability", () => {
    const session = mountedSession();
    const timer = session.beginTimerAction("show-1");
    session.complete(timer.token!, true);
    const retry = session.acquireRetry("show-1");
    session.complete(retry.token!, true);
    assert.equal(session.canStartRetry("show-1"), true);
  });

  it("successful Retry release removes availability", () => {
    const session = mountedSession();
    const timer = session.beginTimerAction("show-1");
    session.complete(timer.token!, true);
    const retry = session.acquireRetry("show-1");
    session.complete(retry.token!, false);
    assert.equal(session.snapshot().phase, "idle");
    assert.equal(session.canStartRetry("show-1"), false);
  });

  it("reconstruction has an explicit phase and cannot overlap Finish", () => {
    const session = mountedSession();
    const timer = session.beginTimerAction("show-1");
    assert.equal(session.beginReconstruction("show-1").reason, "phase_busy");
    session.complete(timer.token!, false);
    const reconstruction = session.beginReconstruction("show-1");
    assert.equal(reconstruction.ok, true);
    assert.equal(session.snapshot().phase, "reconstruction");
  });

  it("reconstruction can publish genuine retry availability", () => {
    const session = mountedSession();
    const reconstruction = session.beginReconstruction("show-1");
    session.complete(reconstruction.token!, true);
    assert.equal(session.canStartRetry("show-1"), true);
  });

  it("show switch invalidates an explicit Retry settlement", () => {
    const session = mountedSession();
    const timer = session.beginTimerAction("show-1");
    session.complete(timer.token!, true);
    const retry = session.acquireRetry("show-1");
    session.setShowId("show-2");
    assert.equal(session.isStillAuthoritative("show-1", retry.token!), false);
    assert.equal(session.complete(retry.token!, true), false);
  });

  it("production hook/page wire acquisition to one service invocation and production presentation", async () => {
    const hookSource = await readFile(
      new URL("../hooks/useShowProductionTimer.ts", import.meta.url),
      "utf8",
    );
    const pageSource = await readFile(
      new URL("../pages/UpcomingShowsPage.tsx", import.meta.url),
      "utf8",
    );
    assert.match(hookSource, /executeShowReconciliationRetry\(\{/);
    assert.match(
      hookSource,
      /invoke:\s*\(requestIds\)\s*=>\s*upcomingShowService\.retryShowCompletionReconciliation\(/,
    );
    assert.match(hookSource, /deriveShowReconciliationRetryPresentation\(/);
    assert.match(pageSource, /disabled=\{productionTimer\.retryButtonDisabled\}/);
    assert.match(pageSource, /\{productionTimer\.retryButtonLabel\}/);
  });
});
