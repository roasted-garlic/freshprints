import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Regression coverage for the AI Processing reconciliation defect
 * (post-launch-catalog-and-processing-stability, Workstream D).
 *
 * Two compounding bugs, both fixed here:
 * 1. executeRerunToProcessing relied solely on tab navigation's own
 *    side-effect refetch to reconcile the Processing list/count, instead
 *    of calling reloadDesigns()/onQueueChanged() deterministically the
 *    same way every other inbox action in this file does.
 * 2. enqueueDesign treated a benign, server-confirmed "already reached
 *    its desired terminal state" outcome (reason: "already_terminal") the
 *    same as a genuine failure, throwing "This design is no longer
 *    eligible for automatic AI enqueue." even after a successful run.
 */
describe("AI Processing reconciliation — reprocess deterministically reloads before navigating", () => {
  it("executeRerunToProcessing calls reloadDesigns() and onQueueChanged() before onNavigateToTab (authoritative Processing recovery order)", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
    );

    const rerunBlock = source.slice(
      source.indexOf("const executeRerunToProcessing = useCallback("),
      source.indexOf("const requestRerunAiSuggestions = useCallback("),
    );

    assert.match(rerunBlock, /await reloadDesigns\(\);/);

    const reloadIndex = rerunBlock.indexOf("await reloadDesigns();");
    const queueChangedIndex = rerunBlock.indexOf("options?.onQueueChanged?.();");
    const navigateIndex = rerunBlock.indexOf("options?.onNavigateToTab?.(");

    assert.ok(reloadIndex > -1 && queueChangedIndex > -1 && navigateIndex > -1);
    assert.ok(
      reloadIndex < queueChangedIndex && queueChangedIndex < navigateIndex,
      "reloadDesigns must run, then onQueueChanged, before tab navigation — not rely on " +
        "navigation's own refetch to reconcile the Processing list/count",
    );
  });

  it("reloadDesigns is a real dependency of executeRerunToProcessing's useCallback, not accidentally stale-closed", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
    );
    const rerunBlock = source.slice(
      source.indexOf("const executeRerunToProcessing = useCallback("),
      source.indexOf("const requestRerunAiSuggestions = useCallback("),
    );
    const depsMatch = rerunBlock.match(/\}, \[([^\]]*)\]\);/);
    assert.ok(depsMatch, "expected to find the useCallback dependency array");
    assert.match(depsMatch![1]!, /reloadDesigns/);
  });
});

describe("AI Processing reconciliation — duplicate/stale enqueue is an idempotent no-op, not a hard error", () => {
  it("enqueueDesign does not throw when the callable reports reason: already_terminal", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );

    assert.match(source, /if \(!result\.queued && result\.reason !== "already_terminal"\) \{/);
    // Confirms the throw guard is now conditioned on more than the bare
    // `!result.queued` check the defect shipped with.
    assert.doesNotMatch(source, /if \(!result\.queued\) \{\s*\n\s*setEnqueueingDesignId\(null\);\s*\n\s*throw new Error\(/);
  });

  it("still throws for a genuinely ineligible/failed enqueue (e.g. already_processing)", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );
    assert.match(source, /This design is already being processed\./);
    assert.match(source, /AI processing could not be queued\. Please try again\./);
  });

  it("applies the design patch for an already-terminal result the same way as a completed result", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );
    const enqueueBlock = source.slice(
      source.indexOf("const enqueueDesign = useCallback("),
      source.indexOf("const refreshDesignList = useCallback("),
    );
    assert.match(enqueueBlock, /buildDesignPatchFromEnqueueResult\(result\)/);
    assert.match(enqueueBlock, /applyDesignPatch\(designId, patch\)/);
  });
});

/**
 * Regression coverage for the AI Processing controller/count reconciliation defect
 * (post-launch-catalog-and-processing-stability, Owner QA Amendment 1, Workstream 2).
 *
 * The prior pass (commit eeec2e2) only fixed executeRerunToProcessing (rerun-from-inbox). The
 * owner's confirmed reproduction — reprocess → completes → Processing count stays stale → "Start
 * AI" stays disabled → only fixed by navigating away and back — exercises the manual single-image
 * "Process image with AI" (processSelectedDesign) and auto-advance queue (runAutoQueueLoop) paths,
 * neither of which the prior fix touched.
 */
describe("AI Processing controller/count reconciliation — manual process and auto-queue paths", () => {
  it("refreshDesignList (used by both processSelectedDesign and runAutoQueueLoop) calls onQueueChanged and gates list reload after terminal patch", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );
    const refreshBlock = source.slice(
      source.indexOf("const refreshDesignList = useCallback("),
      source.indexOf("const runAutoQueueLoop = useCallback("),
    );
    assert.match(refreshBlock, /if \(!refreshOptions\?\.skipListReload\) \{/);
    assert.match(refreshBlock, /await reloadDesigns\(\);/);
    assert.match(refreshBlock, /onQueueChanged\?\.\(\);/);

    const processBlock = source.slice(source.indexOf("const processSelectedDesign = useCallback("));
    assert.match(
      processBlock,
      /refreshDesignList\(\{\s*skipListReload: hasTerminalAiProcessingLedgerEntry\(selectedDesignId\),\s*\}\)/,
    );

    const loopBlock = source.slice(
      source.indexOf("const runAutoQueueLoop = useCallback("),
      source.indexOf("const startAutoQueue = useCallback("),
    );
    assert.match(
      loopBlock,
      /refreshDesignList\(\{\s*skipListReload: hasTerminalAiProcessingLedgerEntry\(design\.id\),\s*\}\)/,
    );
  });

  it("useAiProcessingQueueOptions accepts onQueueChanged and useAiReviewInbox threads it through from its own options", () => {
    const hookSource = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );
    assert.match(hookSource, /onQueueChanged\?:\s*\(\) => void;/);

    const inboxSource = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
    );
    const processingQueueCallBlock = inboxSource.slice(
      inboxSource.indexOf("const processingQueue = useAiProcessingQueue({"),
      inboxSource.indexOf("const processingQueue = useAiProcessingQueue({") + 400,
    );
    assert.match(processingQueueCallBlock, /onQueueChanged: options\?\.onQueueChanged,/);
  });

  it("processSelectedDesign clears selection (does not leave a dangling selectedDesignId) when no design remains awaiting AI start", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );
    const processBlock = source.slice(
      source.indexOf("const processSelectedDesign = useCallback("),
      source.indexOf("}, [\n    advanceSelectionToIndex,"),
    );

    assert.match(processBlock, /if \(nextIndex >= 0\) \{/);
    assert.match(processBlock, /requestSelectDesign\(null\);/);

    const ifIndex = processBlock.indexOf("if (nextIndex >= 0) {");
    const elseIndex = processBlock.indexOf("} else {");
    const requestSelectNullIndex = processBlock.indexOf("requestSelectDesign(null);");
    assert.ok(
      ifIndex > -1 && elseIndex > ifIndex && requestSelectNullIndex > elseIndex,
      "requestSelectDesign(null) must be the else-branch companion to the nextIndex >= 0 advance",
    );
  });

  it("runAutoQueueLoop clears selection at both natural loop-exit points (index exhausted, no next awaiting design)", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );
    const loopBlock = source.slice(
      source.indexOf("const runAutoQueueLoop = useCallback("),
      source.indexOf("const startAutoQueue = useCallback("),
    );

    const indexExhaustedBlock = loopBlock.slice(
      loopBlock.indexOf("if (index >= currentDesigns.length) {"),
      loopBlock.indexOf("const nextAwaitingIndex = findNextAwaitingIndex"),
    );
    assert.match(indexExhaustedBlock, /requestSelectDesign\(null\);/);

    const noAwaitingBlock = loopBlock.slice(
      loopBlock.indexOf("if (nextAwaitingIndex < 0) {"),
      loopBlock.indexOf("index = nextAwaitingIndex;"),
    );
    assert.match(noAwaitingBlock, /requestSelectDesign\(null\);/);
  });

  it("requestSelectDesign is a real dependency of both processSelectedDesign and runAutoQueueLoop's useCallback", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );

    // File order is runAutoQueueLoop, then startAutoQueue, then stopAutoQueue, then
    // processSelectedDesign — slice to end-of-file for processSelectedDesign since it's the last
    // of these four in the file. Dependency arrays close in two different textual shapes in this
    // file ("}, [a, b]);" on one line, or "},\n    [a, b],\n  );" split across lines) — rather
    // than matching the exact closing shape, just confirm requestSelectDesign appears somewhere
    // in the tail of each function's own block (after its last requestSelectDesign(null) call),
    // which is where a useCallback's dependency array always lives.
    const processBlock = source.slice(source.indexOf("const processSelectedDesign = useCallback("));
    const processTail = processBlock.slice(processBlock.lastIndexOf("requestSelectDesign(null);"));
    assert.match(
      processTail,
      /requestSelectDesign/,
      "expected requestSelectDesign to also appear in processSelectedDesign's dependency array",
    );
    assert.ok(
      (processTail.match(/requestSelectDesign/g) ?? []).length >= 2,
      "expected requestSelectDesign to appear both in the call and in the dependency array",
    );

    const loopBlock = source.slice(
      source.indexOf("const runAutoQueueLoop = useCallback("),
      source.indexOf("const startAutoQueue = useCallback("),
    );
    const loopTail = loopBlock.slice(loopBlock.lastIndexOf("requestSelectDesign(null);"));
    assert.ok(
      (loopTail.match(/requestSelectDesign/g) ?? []).length >= 2,
      "expected requestSelectDesign to appear both in the call and in runAutoQueueLoop's dependency array",
    );
  });
});

// Amendment 2, Defect A: backend-initiated completion (no client action) — the selected design's
// live listener only reloaded the design list, never the count, so a design completing while
// selected still left Processing's count stale even though the list itself updated.
describe("useAiReviewInbox live-design reconciliation calls onQueueChanged (Amendment 2, Defect A)", () => {
  it("the needs_review live-design effect patches locally and calls onQueueChanged without list reload", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
    );
    const start = source.indexOf(
      "// Owner QA Amendment 7 follow-up: this effect previously depended on `options`",
    );
    const end = source.indexOf(
      "// Owner QA Amendment 3, Failure 1 (initial fix) found that the background AI pump was",
    );
    const effectBlock = source.slice(start, end);
    assert.match(effectBlock, /applyDesignPatch\(liveDesign\.id,/);
    assert.match(effectBlock, /optionsRef\.current\?\.onQueueChanged\?\.\(\)/);
    assert.doesNotMatch(effectBlock, /void reloadDesigns\(\);/);
  });
});
