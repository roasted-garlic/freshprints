import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPrintRequestWorkingEmptyAutoArchiveCutoffMs,
  getPrintRequestWorkingIdleCutoffMs,
  getPrintRequestWorkingStaleCutoffMs,
  getPrintRequestWorkingTriageLabel,
  isEmptyWorkingPrintRequestEligibleForAutoArchive,
  isPrintRequestIncludedInListTabs,
  matchesPrintRequestWorkingTriageFilter,
  PRINT_REQUEST_WORKING_EMPTY_AUTO_ARCHIVE_AFTER_DAYS,
  PRINT_REQUEST_WORKING_IDLE_AFTER_HOURS,
  PRINT_REQUEST_WORKING_STALE_AFTER_DAYS,
  PRINT_REQUEST_WORKING_TRIAGE_FILTERS,
  resolvePrintRequestWorkingTriageBucket,
} from "./printRequestWorkingTriage";

describe("printRequestWorkingTriage", () => {
  const nowMs = Date.UTC(2026, 6, 13, 12, 0, 0);
  const activeMs = nowMs - 12 * 60 * 60 * 1000;
  const idleMs = nowMs - (PRINT_REQUEST_WORKING_IDLE_AFTER_HOURS + 1) * 60 * 60 * 1000;
  const staleMs = nowMs - (PRINT_REQUEST_WORKING_STALE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000;
  const emptyArchiveMs =
    nowMs - (PRINT_REQUEST_WORKING_EMPTY_AUTO_ARCHIVE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000;

  it("excludes archived from list tabs", () => {
    assert.equal(isPrintRequestIncludedInListTabs("archived"), false);
    assert.equal(isPrintRequestIncludedInListTabs("draft"), true);
  });

  it("classifies empty, active, idle, and stale buckets", () => {
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({ itemCount: 0, updatedAtMillis: activeMs, nowMs }),
      "empty",
    );
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({ itemCount: 3, updatedAtMillis: activeMs, nowMs }),
      "active",
    );
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({ itemCount: 3, updatedAtMillis: idleMs, nowMs }),
      "idle",
    );
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({ itemCount: 3, updatedAtMillis: staleMs, nowMs }),
      "stale",
    );
  });

  it("uses 48h for idle and 7d for stale boundaries", () => {
    const justUnderIdle =
      nowMs - (PRINT_REQUEST_WORKING_IDLE_AFTER_HOURS * 60 * 60 * 1000 - 1);
    const justOverIdle =
      nowMs - (PRINT_REQUEST_WORKING_IDLE_AFTER_HOURS * 60 * 60 * 1000 + 1);
    const justUnderStale =
      nowMs - (PRINT_REQUEST_WORKING_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000 - 1);
    const justOverStale =
      nowMs - (PRINT_REQUEST_WORKING_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000 + 1);

    assert.equal(
      resolvePrintRequestWorkingTriageBucket({
        itemCount: 1,
        updatedAtMillis: justUnderIdle,
        nowMs,
      }),
      "active",
    );
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({
        itemCount: 1,
        updatedAtMillis: justOverIdle,
        nowMs,
      }),
      "idle",
    );
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({
        itemCount: 1,
        updatedAtMillis: justUnderStale,
        nowMs,
      }),
      "idle",
    );
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({
        itemCount: 1,
        updatedAtMillis: justOverStale,
        nowMs,
      }),
      "stale",
    );
  });

  it("matches triage filters", () => {
    assert.equal(matchesPrintRequestWorkingTriageFilter("active", "all"), true);
    assert.equal(matchesPrintRequestWorkingTriageFilter("idle", "active"), false);
    assert.equal(matchesPrintRequestWorkingTriageFilter("idle", "idle"), true);
    assert.equal(matchesPrintRequestWorkingTriageFilter("stale", "active"), false);
    assert.equal(matchesPrintRequestWorkingTriageFilter("empty", "empty"), true);
  });

  it("auto-archives only empty past the empty-archive cutoff", () => {
    assert.equal(
      isEmptyWorkingPrintRequestEligibleForAutoArchive({
        itemCount: 0,
        updatedAtMillis: emptyArchiveMs,
        nowMs,
      }),
      true,
    );
    assert.equal(
      isEmptyWorkingPrintRequestEligibleForAutoArchive({
        itemCount: 0,
        updatedAtMillis: idleMs,
        nowMs,
      }),
      false,
    );
    assert.equal(
      isEmptyWorkingPrintRequestEligibleForAutoArchive({
        itemCount: 0,
        updatedAtMillis: activeMs,
        nowMs,
      }),
      false,
    );
    assert.equal(
      isEmptyWorkingPrintRequestEligibleForAutoArchive({
        itemCount: 2,
        updatedAtMillis: emptyArchiveMs,
        nowMs,
      }),
      false,
    );
  });

  it("computes idle, stale, and empty-archive cutoffs separately", () => {
    assert.equal(getPrintRequestWorkingIdleCutoffMs(nowMs, 48), nowMs - 48 * 60 * 60 * 1000);
    assert.equal(getPrintRequestWorkingStaleCutoffMs(nowMs, 7), nowMs - 7 * 24 * 60 * 60 * 1000);
    assert.equal(
      getPrintRequestWorkingEmptyAutoArchiveCutoffMs(nowMs, 14),
      nowMs - 14 * 24 * 60 * 60 * 1000,
    );
  });

  it("lists needs_requeue last in filter order and labels idle", () => {
    assert.equal(
      PRINT_REQUEST_WORKING_TRIAGE_FILTERS[PRINT_REQUEST_WORKING_TRIAGE_FILTERS.length - 1],
      "needs_requeue",
    );
    assert.deepEqual([...PRINT_REQUEST_WORKING_TRIAGE_FILTERS], [
      "active",
      "idle",
      "stale",
      "empty",
      "all",
      "needs_requeue",
    ]);
    assert.equal(getPrintRequestWorkingTriageLabel("idle"), "Idle");
    assert.equal(getPrintRequestWorkingTriageLabel("needs_requeue"), "Needs Re-queue");
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({
        itemCount: 2,
        updatedAtMillis: staleMs,
        needsStaffRequeueAt: { toMillis: () => staleMs },
        nowMs,
      }),
      "needs_requeue",
    );
    assert.equal(matchesPrintRequestWorkingTriageFilter("needs_requeue", "needs_requeue"), true);
  });
});
