import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPrintRequestWorkingStaleCutoffMs,
  getPrintRequestWorkingTriageLabel,
  isEmptyWorkingPrintRequestEligibleForAutoArchive,
  isPrintRequestIncludedInListTabs,
  matchesPrintRequestWorkingTriageFilter,
  PRINT_REQUEST_WORKING_STALE_AFTER_DAYS,
  PRINT_REQUEST_WORKING_TRIAGE_FILTERS,
  resolvePrintRequestWorkingTriageBucket,
} from "./printRequestWorkingTriage";

describe("printRequestWorkingTriage", () => {
  const nowMs = Date.UTC(2026, 6, 13, 12, 0, 0);
  const freshMs = nowMs - 2 * 24 * 60 * 60 * 1000;
  const staleMs = nowMs - (PRINT_REQUEST_WORKING_STALE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000;

  it("excludes archived from list tabs", () => {
    assert.equal(isPrintRequestIncludedInListTabs("archived"), false);
    assert.equal(isPrintRequestIncludedInListTabs("draft"), true);
  });

  it("classifies empty, active, and stale buckets", () => {
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({ itemCount: 0, updatedAtMillis: freshMs, nowMs }),
      "empty",
    );
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({ itemCount: 3, updatedAtMillis: freshMs, nowMs }),
      "active",
    );
    assert.equal(
      resolvePrintRequestWorkingTriageBucket({ itemCount: 3, updatedAtMillis: staleMs, nowMs }),
      "stale",
    );
  });

  it("matches triage filters", () => {
    assert.equal(matchesPrintRequestWorkingTriageFilter("active", "all"), true);
    assert.equal(matchesPrintRequestWorkingTriageFilter("stale", "active"), false);
    assert.equal(matchesPrintRequestWorkingTriageFilter("empty", "empty"), true);
  });

  it("auto-archives only empty past cutoff", () => {
    assert.equal(
      isEmptyWorkingPrintRequestEligibleForAutoArchive({
        itemCount: 0,
        updatedAtMillis: staleMs,
        nowMs,
      }),
      true,
    );
    assert.equal(
      isEmptyWorkingPrintRequestEligibleForAutoArchive({
        itemCount: 0,
        updatedAtMillis: freshMs,
        nowMs,
      }),
      false,
    );
    assert.equal(
      isEmptyWorkingPrintRequestEligibleForAutoArchive({
        itemCount: 2,
        updatedAtMillis: staleMs,
        nowMs,
      }),
      false,
    );
  });

  it("computes stale cutoff from days", () => {
    assert.equal(
      getPrintRequestWorkingStaleCutoffMs(nowMs, 14),
      nowMs - 14 * 24 * 60 * 60 * 1000,
    );
  });

  it("lists needs_requeue last in filter order", () => {
    assert.equal(
      PRINT_REQUEST_WORKING_TRIAGE_FILTERS[PRINT_REQUEST_WORKING_TRIAGE_FILTERS.length - 1],
      "needs_requeue",
    );
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
