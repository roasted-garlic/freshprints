import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Source wiring checks for Approach C (monotonic AI Processing reconciliation repair).
 * Behavioral stale-reintroduction coverage lives in monotonicAiProcessingListMerge.test.ts.
 */
describe("AI Processing monotonic reconciliation wiring (Approach C)", () => {
  it("useDesigns records ledger, invalidates caches on terminal patch, and merges pending accepts", () => {
    const source = readFileSync(
      "apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts",
      "utf8",
    );
    assert.match(source, /recordTerminalAiProcessingPatch\(/);
    assert.match(source, /designService\.invalidateReadCaches\(/);
    assert.match(source, /applyMonotonicPendingProcessingListMerge\(/);
    assert.match(source, /clearTerminalAiProcessingLedgerEntry/);
    assert.match(source, /hasTerminalAiProcessingLedgerEntry/);
    assert.match(source, /isPendingProcessingQuery: requestListQuery\.aiReviewStatus === "pending"/);
  });

  it("designService exports invalidateReadCaches", () => {
    const source = readFileSync(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
      "utf8",
    );
    assert.match(source, /invalidateReadCaches\(designId\?: string\): void/);
  });

  it("retry and rerun clear the terminal ledger before returning a design to Processing", () => {
    const source = readFileSync(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
      "utf8",
    );
    const rerunBlock = source.slice(
      source.indexOf("const executeRerunToProcessing = useCallback("),
      source.indexOf("const requestRerunAiSuggestions = useCallback("),
    );
    assert.match(rerunBlock, /clearTerminalAiProcessingLedgerEntry\(designId\)/);
    assert.ok(
      rerunBlock.indexOf("clearTerminalAiProcessingLedgerEntry(designId)") <
        rerunBlock.indexOf("reconcileSuccessfulReprocess("),
      "ledger must clear before the local pending membership patch",
    );

    const retryBlock = source.slice(
      source.indexOf("const retryProcessingSelected = useCallback("),
      source.indexOf("const ignoreSuggestedTag = useCallback("),
    );
    assert.match(retryBlock, /clearTerminalAiProcessingLedgerEntry\(selectedDesign\.id\)/);
    assert.ok(
      retryBlock.indexOf("clearTerminalAiProcessingLedgerEntry(selectedDesign.id)") <
        retryBlock.indexOf("retryFailedProcessing"),
      "ledger must clear before retry enqueue",
    );
  });

  it("observer no-patch fallback still reloads (P2 preserved)", () => {
    const source = readFileSync(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
      "utf8",
    );
    assert.match(source, /outcome: "observer-fallback"/);
    assert.match(source, /void reloadDesigns\(\);/);
  });

  it("does not touch background pump or reconciliation pure helper files", () => {
    // Guard against accidental scope expansion into pump/reconciliation modules.
    const importQueue = readFileSync(
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
      "utf8",
    );
    const reconciliation = readFileSync(
      "apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.ts",
      "utf8",
    );
    assert.doesNotMatch(importQueue, /monotonicAiProcessingListMerge/);
    assert.doesNotMatch(reconciliation, /monotonicAiProcessingListMerge/);
  });
});
